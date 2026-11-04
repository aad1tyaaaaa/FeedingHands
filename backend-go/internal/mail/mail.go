// Package mail sends plain-text email over SMTP (STARTTLS when the server offers it, e.g. port 587).
package mail

import (
	"cmp"
	"net/mail"
	"net/smtp"
	"os"
	"strings"
)

type Sender struct {
	host, port, user, pass, from string
}

// FromEnv returns nil when SMTP_HOST is unset, meaning "no email configured".
func FromEnv() *Sender {
	host := os.Getenv("SMTP_HOST")
	if host == "" {
		return nil
	}
	return &Sender{
		host: host,
		port: cmp.Or(os.Getenv("SMTP_PORT"), "587"),
		user: os.Getenv("SMTP_USER"),
		pass: os.Getenv("SMTP_PASS"),
		from: cmp.Or(os.Getenv("SMTP_FROM"), os.Getenv("SMTP_USER")),
	}
}

// Send mails body to one address. Callers pass a validated address and a constant subject,
// and CR/LF are stripped anyway so nothing can inject extra headers.
func (s *Sender) Send(to, subject, body string) error {
	clean := strings.NewReplacer("\r", "", "\n", "")
	msg := "From: " + clean.Replace(s.from) + "\r\n" +
		"To: " + clean.Replace(to) + "\r\n" +
		"Subject: " + clean.Replace(subject) + "\r\n" +
		"MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + body
	var a smtp.Auth
	if s.user != "" {
		a = smtp.PlainAuth("", s.user, s.pass, s.host)
	}
	// The header may carry a display name ("FeedingHands <no-reply@x.org>"); the envelope needs the bare address.
	envelope := s.from
	if addr, err := mail.ParseAddress(s.from); err == nil {
		envelope = addr.Address
	}
	return smtp.SendMail(s.host+":"+s.port, a, envelope, []string{clean.Replace(to)}, []byte(msg))
}
