# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy module manifest and download dependencies
COPY go.mod ./
RUN go mod download

# Copy source code and build
COPY . .
RUN go build -o server ./cmd/server/main.go

# Production stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server .

# Expose port 8080
EXPOSE 8080

CMD ["./server"]
