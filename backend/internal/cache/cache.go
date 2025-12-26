package cache

import (
	"sync"
	"time"
)

// Cache defines the interface for cache operations
type Cache interface {
	Set(key string, value interface{}, expiration time.Duration) error
	Get(key string) (interface{}, bool)
	Delete(key string) error
	Exists(key string) bool
}

// MemoryCache implements an in-memory cache
type MemoryCache struct {
	data  map[string]cacheItem
	mutex sync.RWMutex
}

type cacheItem struct {
	value      interface{}
	expiration time.Time
}

// NewMemoryCache creates a new in-memory cache
func NewMemoryCache() *MemoryCache {
	cache := &MemoryCache{
		data: make(map[string]cacheItem),
	}
	// Start cleanup goroutine
	go cache.cleanup()
	return cache
}

// Set stores a value in the cache
func (c *MemoryCache) Set(key string, value interface{}, expiration time.Duration) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	c.data[key] = cacheItem{
		value:      value,
		expiration: time.Now().Add(expiration),
	}
	return nil
}

// Get retrieves a value from the cache
func (c *MemoryCache) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	item, exists := c.data[key]
	if !exists {
		return nil, false
	}

	if time.Now().After(item.expiration) {
		return nil, false
	}

	return item.value, true
}

// Delete removes a value from the cache
func (c *MemoryCache) Delete(key string) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	delete(c.data, key)
	return nil
}

// Exists checks if a key exists in the cache
func (c *MemoryCache) Exists(key string) bool {
	c.mutex.RLock()
	defer c.mutex.RUnlock()

	item, exists := c.data[key]
	if !exists {
		return false
	}

	return time.Now().Before(item.expiration)
}

// cleanup periodically removes expired items
func (c *MemoryCache) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		c.mutex.Lock()
		now := time.Now()
		for key, item := range c.data {
			if now.After(item.expiration) {
				delete(c.data, key)
			}
		}
		c.mutex.Unlock()
	}
}
