// Package httpx holds the small HTTP helpers every handler shares.
package httpx

import (
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"net/mail"
	"runtime/debug"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"
)

// JSON writes v as a JSON response with the given status code.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("encode response: %v", err)
	}
}

// Error sends {"message": msg}, the error shape the frontend's apiFetch reads.
func Error(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, map[string]string{"message": msg})
}

// Internal logs the real error and sends a generic 500, so database details never reach the client.
func Internal(w http.ResponseWriter, r *http.Request, err error) {
	log.Printf("%s %s: %v", r.Method, r.URL.Path, err)
	Error(w, http.StatusInternalServerError, "Something went wrong, please try again")
}

// Decode reads a JSON body of at most 1 MB into v. On failure it has already written a 400 or 413.
func Decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	err := json.NewDecoder(r.Body).Decode(v)
	if err == nil {
		return true
	}
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		Error(w, http.StatusRequestEntityTooLarge, "Request body is too large")
	} else {
		Error(w, http.StatusBadRequest, "Request body must be valid JSON")
	}
	return false
}

// CORS allows the listed origins ("*" or an empty list allows any). Auth uses a Bearer header, not cookies.
func CORS(origins []string, next http.Handler) http.Handler {
	allowAll := len(origins) == 0 || slices.Contains(origins, "*")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin != "" && (allowAll || slices.Contains(origins, origin)) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// Logger logs every request and turns a panic in a handler into a 500 instead of a dropped connection.
func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		defer func() {
			if p := recover(); p != nil {
				log.Printf("panic: %v\n%s", p, debug.Stack())
				Error(rec, http.StatusInternalServerError, "Something went wrong, please try again")
			}
			log.Printf("%s %s %d %s", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
		}()
		next.ServeHTTP(rec, r)
	})
}

// ValidEmail accepts a bare address like "a@b.org" (no display name).
func ValidEmail(s string) bool {
	addr, err := mail.ParseAddress(s)
	return err == nil && addr.Address == s
}

// Origins splits a comma-separated CORS_ORIGIN value.
func Origins(s string) []string {
	var out []string
	for _, o := range strings.Split(s, ",") {
		if o = strings.TrimSpace(o); o != "" {
			out = append(out, o)
		}
	}
	return out
}

// Secure adds the response headers every API answer should carry.
func Secure(hsts bool, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		if hsts {
			h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		}
		next.ServeHTTP(w, r)
	})
}

// ClientIP is the caller's address. Behind a proxy (TRUST_PROXY=true) it is the last X-Forwarded-For hop,
// the one the proxy itself appended; earlier hops are client-controlled and can be forged.
func ClientIP(r *http.Request, trustProxy bool) string {
	if trustProxy {
		if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
			parts := strings.Split(xff, ",")
			return strings.TrimSpace(parts[len(parts)-1])
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// Limiter allows each client IP at most n requests per window.
// ponytail: in-memory fixed window, per instance; move to Redis if the API runs on several replicas.
type Limiter struct {
	n          int
	window     time.Duration
	trustProxy bool

	mu    sync.Mutex
	start time.Time
	hits  map[string]int
}

func NewLimiter(n int, window time.Duration, trustProxy bool) *Limiter {
	return &Limiter{n: n, window: window, trustProxy: trustProxy, hits: map[string]int{}}
}

func (l *Limiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if now := time.Now(); now.Sub(l.start) >= l.window {
		l.start, l.hits = now, map[string]int{} // new window; dropping the map also bounds memory
	}
	l.hits[ip]++
	return l.hits[ip] <= l.n
}

func (l *Limiter) Wrap(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !l.allow(ClientIP(r, l.trustProxy)) {
			w.Header().Set("Retry-After", strconv.Itoa(int(l.window.Seconds())))
			Error(w, http.StatusTooManyRequests, "Too many attempts, please wait a minute and try again")
			return
		}
		next(w, r)
	}
}
