package middleware

import (
	"bufio"
	_ "embed"
	"fmt"
	"sort"
	"strings"
	"sync"
	"unicode"

	"github.com/cloudflare/ahocorasick"
	"golang.org/x/text/unicode/norm"
)

//go:embed bad_words.txt
var embeddedBadWords string

type ModerationResult struct {
	SanitizedText  string
	NormalizedText string
	DetectedWords  []string
}

type moderationEngine struct {
	matcher            *ahocorasick.Matcher
	normalizedPatterns []string
	displayWordByKey   map[string]string
}

var (
	moderationOnce sync.Once
	moderationData *moderationEngine
	moderationErr  error
)

var leetRuneMap = map[rune]rune{
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'7': 't',
	'8': 'b',
	'9': 'g',
	'@': 'a',
	'$': 's',
	'!': 'i',
	'+': 't',
}

func InitContentModeration() error {
	moderationOnce.Do(func() {
		moderationData, moderationErr = buildModerationEngine()
	})
	return moderationErr
}

func ModerationDictionarySize() int {
	if err := InitContentModeration(); err != nil {
		return 0
	}
	return len(moderationData.normalizedPatterns)
}

func ModerateListingContent(title, description string) ModerationResult {
	if err := InitContentModeration(); err != nil {
		fmt.Println("[MODERATION] failed to initialize matcher:", err.Error())
		return ModerationResult{}
	}

	merged := strings.TrimSpace(title + " " + description)
	sanitized := SanitizeModerationText(merged)
	normalized := NormalizeModerationText(sanitized)
	if normalized == "" {
		return ModerationResult{
			SanitizedText:  sanitized,
			NormalizedText: normalized,
			DetectedWords:  []string{},
		}
	}

	hits := moderationData.matcher.MatchThreadSafe([]byte(normalized))
	if len(hits) == 0 {
		return ModerationResult{
			SanitizedText:  sanitized,
			NormalizedText: normalized,
			DetectedWords:  []string{},
		}
	}

	found := make(map[string]struct{})
	for _, idx := range hits {
		if idx < 0 || idx >= len(moderationData.normalizedPatterns) {
			continue
		}
		key := moderationData.normalizedPatterns[idx]
		displayWord := moderationData.displayWordByKey[key]
		if strings.TrimSpace(displayWord) == "" {
			displayWord = key
		}
		found[displayWord] = struct{}{}
	}

	detectedWords := make([]string, 0, len(found))
	for word := range found {
		detectedWords = append(detectedWords, word)
	}
	sort.Strings(detectedWords)

	fmt.Printf("[MODERATION] detected forbidden words: %v\n", detectedWords)
	fmt.Printf("[MODERATION] original content: %q\n", sanitized)

	return ModerationResult{
		SanitizedText:  sanitized,
		NormalizedText: normalized,
		DetectedWords:  detectedWords,
	}
}

func SanitizeModerationText(input string) string {
	normalized := norm.NFC.String(input)
	return strings.Join(strings.Fields(normalized), " ")
}

func NormalizeModerationText(input string) string {
	lowered := strings.ToLower(input)
	var builder strings.Builder

	for _, r := range lowered {
		if mapped, exists := leetRuneMap[r]; exists {
			r = mapped
		}

		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			builder.WriteRune(r)
		}
	}

	return builder.String()
}

func buildModerationEngine() (*moderationEngine, error) {
	scanner := bufio.NewScanner(strings.NewReader(embeddedBadWords))
	normalizedPatterns := make([]string, 0)
	displayWordByKey := make(map[string]string)
	seen := make(map[string]struct{})

	for scanner.Scan() {
		rawWord := strings.TrimSpace(scanner.Text())
		if rawWord == "" {
			continue
		}

		normalizedWord := NormalizeModerationText(SanitizeModerationText(rawWord))
		if normalizedWord == "" {
			continue
		}

		if _, exists := seen[normalizedWord]; exists {
			continue
		}

		seen[normalizedWord] = struct{}{}
		normalizedPatterns = append(normalizedPatterns, normalizedWord)
		displayWordByKey[normalizedWord] = rawWord
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to read moderation dictionary: %w", err)
	}

	if len(normalizedPatterns) == 0 {
		return nil, fmt.Errorf("moderation dictionary is empty")
	}

	matcher := ahocorasick.NewStringMatcher(normalizedPatterns)

	return &moderationEngine{
		matcher:            matcher,
		normalizedPatterns: normalizedPatterns,
		displayWordByKey:   displayWordByKey,
	}, nil
}
