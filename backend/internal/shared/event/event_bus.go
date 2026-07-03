package event

import (
	"log"
	"sync"
)

type Handler func(data interface{})

type EventBus struct {
	mu       sync.RWMutex
	handlers map[string][]Handler
}

func NewEventBus() *EventBus {
	return &EventBus{
		handlers: make(map[string][]Handler),
	}
}

func (b *EventBus) Subscribe(eventName string, handler Handler) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.handlers[eventName] = append(b.handlers[eventName], handler)
}

func (b *EventBus) Publish(eventName string, data interface{}) {
	b.mu.RLock()
	handlers, ok := b.handlers[eventName]
	b.mu.RUnlock()

	if !ok {
		return
	}

	// Trigger each handler in its own goroutine to avoid blocking the publisher.
	// Each goroutine recovers panics so a single subscriber cannot crash the process.
	for _, h := range handlers {
		go func(handler Handler) {
			defer func() {
				if rec := recover(); rec != nil {
					log.Printf("[EventBus] panic in handler for %q: %v", eventName, rec)
				}
			}()
			handler(data)
		}(h)
	}
}
