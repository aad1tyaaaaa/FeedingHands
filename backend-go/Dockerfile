# Build a static binary, then ship it on a minimal non-root image (CA certificates included for SMTP/TLS).
FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/api /api
ENV PORT=5001
EXPOSE 5001
ENTRYPOINT ["/api"]
