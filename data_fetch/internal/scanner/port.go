package scanner

import (
	"bufio"
	"context"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"
)

// CommonPorts is a curated set of ports most relevant to web/API targets.
var CommonPorts = []int{
	21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143,
	443, 445, 993, 995, 1723, 3306, 3389, 5900, 8080, 8443,
	8888, 9200, 9300, 27017, 6379, 5432, 1433, 2181, 2375, 2376,
}

// PortScanner performs concurrent TCP connect scans.
type PortScanner struct {
	Timeout     time.Duration
	Concurrency int
	GrabBanner  bool
}

func NewPortScanner() *PortScanner {
	return &PortScanner{
		Timeout:     2 * time.Second,
		Concurrency: 100,
		GrabBanner:  true,
	}
}

// Scan checks every port in ports against host.
// Open ports are sent to results channel.
func (ps *PortScanner) Scan(ctx context.Context, host string, ports []int, results chan<- PortResult) {
	sem := make(chan struct{}, ps.Concurrency)
	var wg sync.WaitGroup

	for _, port := range ports {
		select {
		case <-ctx.Done():
			wg.Wait()
			return
		default:
		}

		wg.Add(1)
		sem <- struct{}{}
		go func(p int) {
			defer wg.Done()
			defer func() { <-sem }()

			result, open := ps.probePort(ctx, host, p)
			if !open {
				return
			}

			select {
			case results <- result:
			case <-ctx.Done():
			}
		}(port)
	}

	wg.Wait()
}

func (ps *PortScanner) probePort(ctx context.Context, host string, port int) (PortResult, bool) {
	addr := fmt.Sprintf("%s:%d", host, port)

	dialer := &net.Dialer{Timeout: ps.Timeout}
	conn, err := dialer.DialContext(ctx, "tcp", addr)
	if err != nil {
		return PortResult{}, false
	}
	defer conn.Close()

	result := PortResult{
		Port:     port,
		Protocol: "tcp",
		State:    "open",
	}

	if ps.GrabBanner {
		result.Banner = grabBanner(conn, ps.Timeout)
	}

	return result, true
}

func grabBanner(conn net.Conn, timeout time.Duration) string {
	_ = conn.SetReadDeadline(time.Now().Add(timeout))
	scanner := bufio.NewScanner(conn)
	if scanner.Scan() {
		banner := strings.TrimSpace(scanner.Text())
		// Truncate long banners — we only need identification, not full content
		if len(banner) > 256 {
			banner = banner[:256] + "..."
		}
		return banner
	}
	return ""
}
