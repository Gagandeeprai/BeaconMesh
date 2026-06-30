package event

import (
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

	// Trigger each handler in its own goroutine to avoid blocking the publisher
	for _, h := range handlers {
		go h(data)
	}
}
