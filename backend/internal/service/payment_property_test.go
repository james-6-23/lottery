package service

import (
	"fmt"
	"testing"

	"github.com/leanovate/gopter"
	"github.com/leanovate/gopter/gen"
	"github.com/leanovate/gopter/prop"
)

// Property 14: 支付回调签名验证
// For any payment callback request, the signature must be verified for validity.
// Invalid signatures must be rejected and should not update user points.
// **Validates: Requirements 6.1.6**

func TestProperty14_PaymentCallbackSignatureVerification(t *testing.T) {
	parameters := gopter.DefaultTestParameters()
	parameters.MinSuccessfulTests = getMinSuccessfulTests()
	parameters.Rng.Seed(1234)

	properties := gopter.NewProperties(parameters)

	// Create a payment service instance for testing signature functions
	paymentService := &PaymentService{}

	// Property: Valid signatures should be verified successfully
	properties.Property("valid signatures are verified successfully", prop.ForAll(
		func(pid, tradeNo, outTradeNo, payType, name, money, tradeStatus, secret string) bool {
			// Skip empty values
			if pid == "" || tradeNo == "" || outTradeNo == "" || secret == "" {
				return true
			}

			// Build callback request
			callback := PaymentCallbackRequest{
				PID:         pid,
				TradeNo:     tradeNo,
				OutTradeNo:  outTradeNo,
				Type:        payType,
				Name:        name,
				Money:       money,
				TradeStatus: tradeStatus,
			}

			// Build params map for signing
			params := map[string]string{
				"pid":          callback.PID,
				"trade_no":     callback.TradeNo,
				"out_trade_no": callback.OutTradeNo,
				"type":         callback.Type,
				"name":         callback.Name,
				"money":        callback.Money,
				"trade_status": callback.TradeStatus,
			}

			// Calculate valid signature
			validSign := paymentService.CalculateSign(params, secret)
			callback.Sign = validSign
			callback.SignType = "MD5"

			// Verify signature should pass
			result := paymentService.VerifySignature(callback, secret)
			if !result {
				t.Logf("Valid signature verification failed for params: %+v", params)
				return false
			}

			return true
		},
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "10001"
			}
			return s
		}), // pid
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "T20240101000001"
			}
			return s
		}), // tradeNo
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "O20240101000001"
			}
			return s
		}), // outTradeNo
		gen.OneConstOf("alipay", "wxpay", "qqpay"), // payType
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 128 {
				return s[:128]
			}
			if s == "" {
				return "积分充值"
			}
			return s
		}), // name
		gen.Float64Range(0.01, 10000.00).Map(func(f float64) string {
			return fmt.Sprintf("%.2f", f)
		}), // money
		gen.OneConstOf("TRADE_SUCCESS", "TRADE_FINISHED", "WAIT_BUYER_PAY"), // tradeStatus
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "test_secret_key"
			}
			return s
		}), // secret
	))

	// Property: Invalid signatures should be rejected
	properties.Property("invalid signatures are rejected", prop.ForAll(
		func(pid, tradeNo, outTradeNo, payType, name, money, tradeStatus, secret, wrongSign string) bool {
			// Skip empty values
			if pid == "" || tradeNo == "" || outTradeNo == "" || secret == "" {
				return true
			}

			// Build callback request with wrong signature
			callback := PaymentCallbackRequest{
				PID:         pid,
				TradeNo:     tradeNo,
				OutTradeNo:  outTradeNo,
				Type:        payType,
				Name:        name,
				Money:       money,
				TradeStatus: tradeStatus,
				Sign:        wrongSign, // Use wrong signature
				SignType:    "MD5",
			}

			// Build params map for signing
			params := map[string]string{
				"pid":          callback.PID,
				"trade_no":     callback.TradeNo,
				"out_trade_no": callback.OutTradeNo,
				"type":         callback.Type,
				"name":         callback.Name,
				"money":        callback.Money,
				"trade_status": callback.TradeStatus,
			}

			// Calculate valid signature
			validSign := paymentService.CalculateSign(params, secret)

			// If wrongSign happens to be the valid sign, skip this test case
			if wrongSign == validSign {
				return true
			}

			// Verify signature should fail
			result := paymentService.VerifySignature(callback, secret)
			if result {
				t.Logf("Invalid signature verification should have failed for sign: %s (valid: %s)", wrongSign, validSign)
				return false
			}

			return true
		},
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "10001"
			}
			return s
		}), // pid
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "T20240101000001"
			}
			return s
		}), // tradeNo
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "O20240101000001"
			}
			return s
		}), // outTradeNo
		gen.OneConstOf("alipay", "wxpay", "qqpay"), // payType
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 128 {
				return s[:128]
			}
			if s == "" {
				return "积分充值"
			}
			return s
		}), // name
		gen.Float64Range(0.01, 10000.00).Map(func(f float64) string {
			return fmt.Sprintf("%.2f", f)
		}), // money
		gen.OneConstOf("TRADE_SUCCESS", "TRADE_FINISHED", "WAIT_BUYER_PAY"), // tradeStatus
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "test_secret_key"
			}
			return s
		}), // secret
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "wrong_signature"
			}
			return s
		}), // wrongSign
	))

	// Property: Signatures with wrong secret should be rejected
	properties.Property("signatures with wrong secret are rejected", prop.ForAll(
		func(pid, tradeNo, outTradeNo, payType, name, money, tradeStatus, secret1, secret2 string) bool {
			// Skip empty values or same secrets
			if pid == "" || tradeNo == "" || outTradeNo == "" || secret1 == "" || secret2 == "" || secret1 == secret2 {
				return true
			}

			// Build callback request
			callback := PaymentCallbackRequest{
				PID:         pid,
				TradeNo:     tradeNo,
				OutTradeNo:  outTradeNo,
				Type:        payType,
				Name:        name,
				Money:       money,
				TradeStatus: tradeStatus,
			}

			// Build params map for signing
			params := map[string]string{
				"pid":          callback.PID,
				"trade_no":     callback.TradeNo,
				"out_trade_no": callback.OutTradeNo,
				"type":         callback.Type,
				"name":         callback.Name,
				"money":        callback.Money,
				"trade_status": callback.TradeStatus,
			}

			// Calculate signature with secret1
			signWithSecret1 := paymentService.CalculateSign(params, secret1)
			callback.Sign = signWithSecret1
			callback.SignType = "MD5"

			// Verify with secret2 should fail
			result := paymentService.VerifySignature(callback, secret2)
			if result {
				t.Logf("Signature verification with wrong secret should have failed")
				return false
			}

			return true
		},
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "10001"
			}
			return s
		}), // pid
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "T20240101000001"
			}
			return s
		}), // tradeNo
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			if s == "" {
				return "O20240101000001"
			}
			return s
		}), // outTradeNo
		gen.OneConstOf("alipay", "wxpay", "qqpay"), // payType
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 128 {
				return s[:128]
			}
			if s == "" {
				return "积分充值"
			}
			return s
		}), // name
		gen.Float64Range(0.01, 10000.00).Map(func(f float64) string {
			return fmt.Sprintf("%.2f", f)
		}), // money
		gen.OneConstOf("TRADE_SUCCESS", "TRADE_FINISHED", "WAIT_BUYER_PAY"), // tradeStatus
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "secret_key_one"
			}
			return s
		}), // secret1
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "secret_key_two"
			}
			return s
		}), // secret2
	))

	// Property: Signature calculation is deterministic
	properties.Property("signature calculation is deterministic", prop.ForAll(
		func(pid, tradeNo, outTradeNo, payType, name, money, tradeStatus, secret string) bool {
			// Skip empty values
			if pid == "" || secret == "" {
				return true
			}

			params := map[string]string{
				"pid":          pid,
				"trade_no":     tradeNo,
				"out_trade_no": outTradeNo,
				"type":         payType,
				"name":         name,
				"money":        money,
				"trade_status": tradeStatus,
			}

			// Calculate signature twice
			sign1 := paymentService.CalculateSign(params, secret)
			sign2 := paymentService.CalculateSign(params, secret)

			// Should be the same
			if sign1 != sign2 {
				t.Logf("Signature calculation is not deterministic: %s != %s", sign1, sign2)
				return false
			}

			return true
		},
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "10001"
			}
			return s
		}), // pid
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			return s
		}), // tradeNo
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 64 {
				return s[:64]
			}
			return s
		}), // outTradeNo
		gen.OneConstOf("alipay", "wxpay", "qqpay", ""), // payType
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 128 {
				return s[:128]
			}
			return s
		}), // name
		gen.Float64Range(0.01, 10000.00).Map(func(f float64) string {
			return fmt.Sprintf("%.2f", f)
		}), // money
		gen.OneConstOf("TRADE_SUCCESS", "TRADE_FINISHED", "WAIT_BUYER_PAY", ""), // tradeStatus
		gen.AlphaString().Map(func(s string) string {
			if len(s) > 32 {
				return s[:32]
			}
			if s == "" {
				return "test_secret_key"
			}
			return s
		}), // secret
	))

	properties.TestingRun(t)
}

// Unit test for signature calculation format
func TestSignatureCalculationFormat(t *testing.T) {
	paymentService := &PaymentService{}

	// Test with known values
	params := map[string]string{
		"pid":          "10001",
		"trade_no":     "T123456",
		"out_trade_no": "O123456",
		"type":         "alipay",
		"name":         "test",
		"money":        "10.00",
		"trade_status": "TRADE_SUCCESS",
	}
	secret := "test_secret"

	sign := paymentService.CalculateSign(params, secret)

	// Signature should be 32 characters (MD5 hex)
	if len(sign) != 32 {
		t.Errorf("Signature length should be 32, got %d", len(sign))
	}

	// Signature should be lowercase hex
	for _, c := range sign {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f')) {
			t.Errorf("Signature should be lowercase hex, got character: %c", c)
		}
	}
}

// Unit test for empty params handling
func TestSignatureWithEmptyParams(t *testing.T) {
	paymentService := &PaymentService{}

	// Test with some empty values
	params := map[string]string{
		"pid":          "10001",
		"trade_no":     "",
		"out_trade_no": "O123456",
		"type":         "",
		"name":         "test",
		"money":        "10.00",
		"trade_status": "",
	}
	secret := "test_secret"

	sign := paymentService.CalculateSign(params, secret)

	// Should still produce a valid signature
	if len(sign) != 32 {
		t.Errorf("Signature length should be 32, got %d", len(sign))
	}
}
