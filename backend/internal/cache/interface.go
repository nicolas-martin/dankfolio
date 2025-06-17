package cache

import "time"

type GenericCache[T any] interface {
	Get(key string) (T, bool)
	Set(key string, data T, expiration time.Duration)
}
