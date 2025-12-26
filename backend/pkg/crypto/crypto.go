package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
)

var (
	ErrInvalidKeyLength = errors.New("encryption key must be 32 bytes")
	ErrDecryptionFailed = errors.New("decryption failed")
	ErrInvalidCiphertext = errors.New("invalid ciphertext")
)

// AESCrypto provides AES-GCM encryption/decryption
type AESCrypto struct {
	key []byte
}

// NewAESCrypto creates a new AES crypto instance
// Key must be exactly 32 bytes for AES-256
func NewAESCrypto(key string) (*AESCrypto, error) {
	keyBytes := []byte(key)
	if len(keyBytes) != 32 {
		return nil, ErrInvalidKeyLength
	}
	return &AESCrypto{key: keyBytes}, nil
}

// Encrypt encrypts plaintext using AES-GCM and returns base64 encoded ciphertext
func (c *AESCrypto) Encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts base64 encoded ciphertext using AES-GCM
func (c *AESCrypto) Decrypt(ciphertextBase64 string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextBase64)
	if err != nil {
		return "", ErrInvalidCiphertext
	}

	block, err := aes.NewCipher(c.key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", ErrInvalidCiphertext
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", ErrDecryptionFailed
	}

	return string(plaintext), nil
}

// IsEncrypted checks if a string appears to be encrypted (base64 encoded)
func IsEncrypted(s string) bool {
	if s == "" {
		return false
	}
	_, err := base64.StdEncoding.DecodeString(s)
	return err == nil && len(s) > 20 // Encrypted content should be reasonably long
}
