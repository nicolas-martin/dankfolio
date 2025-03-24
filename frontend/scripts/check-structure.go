package main

import (
	"bufio"
	"fmt"
	"io/ioutil"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/fatih/color"
)

// Constants
var (
	componentDirs = []string{"src/components", "src/screens"}

	frontendExcludeFlags = []string{
		"./frontend/node_modules/*",
		"./frontend/ios/*",
		"./frontend/.*",
		"./frontend/scripts/utils/*",
		"./frontend/src/utils/*",
	}

	backendExcludeFlags = []string{
		"./backend/keys/*",
		"./backend/scripts/*",
		"./backend/internal/model/*",
		"./backend/cmd/*",
		"./backend/internal/service/wallet/*",
		"./backend/internal/wallet/*",
	}

	frontendProtectedDirs = []string{
		"./frontend/assets",
		"./frontend/assets/icons",
		"./frontend/ios",
		"./frontend/node_modules",
		"./frontend/src",
		"./frontend/src/components",
		"./frontend/src/components/chart",
		"./frontend/src/components/chart/coinchart",
		"./frontend/src/components/chart/coininfo",
		"./frontend/src/components/chart/customtooltip",
		"./frontend/src/components/coindetails",
		"./frontend/src/components/coindetails/pricedisplay",
		"./frontend/src/components/common",
		"./frontend/src/components/common/backbutton",
		"./frontend/src/components/common/platformimage",
		"./frontend/src/components/common/toast",
		"./frontend/src/components/common/topbar",
		"./frontend/src/components/home",
		"./frontend/src/components/home/coincard",
		"./frontend/src/components/trade",
		"./frontend/src/components/trade/coinselector",
		"./frontend/src/components/trade/swapbutton",
		"./frontend/src/components/trade/tradebutton",
		"./frontend/src/components/trade/tradedetails",
		"./frontend/src/screens",
		"./frontend/src/screens/coindetail",
		"./frontend/src/screens/home",
		"./frontend/src/screens/profile",
		"./frontend/src/screens/trade",
		"./frontend/src/services",
		"./frontend/src/types",
	}

	backendProtectedDirs = []string{
		"./backend/cmd",
		"./backend/internal",
		"./backend/internal/api",
		"./backend/internal/middleware",
		"./backend/internal/model",
		"./backend/internal/service",
		"./backend/internal/service/coin",
		"./backend/internal/service/price",
		"./backend/internal/service/solana",
		"./backend/internal/service/trade",
		"./backend/internal/service/wallet",
		"./backend/internal/wallet",
		"./backend/keys",
		"./backend/scripts",
	}
)

// Types
type IssueType string

const (
	LogicType     IssueType = "logic"
	StyleType     IssueType = "style"
	TypeType      IssueType = "type"
	StructureType IssueType = "structure"
)

type Issue struct {
	Content string
	Line    int
	Type    IssueType
}

type ComponentCheck struct {
	Name   string
	Path   string
	Issues []Issue
}

type FolderIssue struct {
	Path         string
	OriginalPath string
	Type         string
}

type PatternConfig struct {
	Type          IssueType
	Patterns      []*regexp.Regexp
	ContentPrefix string
}

type ProjectType string

const (
	Frontend ProjectType = "frontend"
	Backend  ProjectType = "backend"
)

type StructureConfig struct {
	ProtectedDirs []string
	BaseDir       string
	ExcludeFlags  []string
}

var structureConfigs = map[ProjectType]StructureConfig{
	Frontend: {
		ProtectedDirs: frontendProtectedDirs,
		BaseDir:       "./frontend",
		ExcludeFlags:  frontendExcludeFlags,
	},
	Backend: {
		ProtectedDirs: backendProtectedDirs,
		BaseDir:       "./backend",
		ExcludeFlags:  backendExcludeFlags,
	},
}

// Pattern configurations
var patternConfigs = []PatternConfig{
	{
		Type: LogicType,
		Patterns: compilePatterns([]string{
			`function\s+\w+\s*\([^)]*\)\s*{[^}]+}`,
			`const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}`,
			`const\s+[A-Z_]+\s*=`,
			`\.map\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)`,
			`\.filter\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)`,
			`\.reduce\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)`,
			`setState\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)`,
			`\.(get|post|put|delete|fetch)\s*\(`,
			`Math\.((?!min|max|round|floor|ceil)\w+)`,
			`handle\w+\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}`,
			`const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*[^;]+;`,
		}),
	},
	{
		Type: StyleType,
		Patterns: compilePatterns([]string{
			`styled\.[a-zA-Z]+\x60[^\x60]*\x60`,
			`styled\([^)]+\)\x60[^\x60]*\x60`,
			`StyleSheet\.create\({[^}]+}\)`,
			`style=\{\s*{[^}]+}\s*\}`,
			`emotion\/styled`,
			`const\s+styles\s*=\s*{[^}]+}`,
			`className={\x60[^}]+\x60}`,
			`const\s+[A-Z_]+(?:_STYLE|_COLOR|_SIZE|_MARGIN|_PADDING|_WIDTH|_HEIGHT)\s*=\s*{[^}]+}`,
			`import\s+{[^}]*}\s+from\s+['"]styled-components['"]`,
			`import\s+{[^}]*}\s+from\s+['"]@emotion[^'"]*['"]`,
			`import\s+{[^}]*}\s+from\s+['"](?!\.\/styles)[^'"]*style[^'"]*['"]`,
		}),
		ContentPrefix: "Style in component: ",
	},
	{
		Type: TypeType,
		Patterns: compilePatterns([]string{
			`interface\s+[A-Z]\w*\s*{[^}]+}`,
			`type\s+[A-Z]\w*\s*=\s*`,
			`enum\s+[A-Z]\w*\s*{[^}]+}`,
			`type\s+[A-Z]\w*<[^>]+>\s*=`,
			`\(\s*{\s*[a-zA-Z]+\s*:\s*[a-zA-Z<>[\]]+[^}]*}\s*\)\s*=>`,
			`\)\s*:\s*{\s*[a-zA-Z]+\s*:\s*[a-zA-Z<>[\]]+[^}]*}\s*=>`,
		}),
		ContentPrefix: "Type in component: ",
	},
}

func compilePatterns(patterns []string) []*regexp.Regexp {
	compiled := make([]*regexp.Regexp, len(patterns))
	for i, p := range patterns {
		compiled[i] = regexp.MustCompile(p)
	}
	return compiled
}

func findIssuesInLine(line string, lineNumber int, config PatternConfig) []Issue {
	var issues []Issue
	for _, pattern := range config.Patterns {
		if pattern.MatchString(line) {
			content := line
			if config.ContentPrefix != "" {
				content = config.ContentPrefix + strings.TrimSpace(line)
			}
			issues = append(issues, Issue{
				Content: content,
				Line:    lineNumber,
				Type:    config.Type,
			})
		}
	}
	return issues
}

func checkComponentStructure(componentPath string) ComponentCheck {
	name := filepath.Base(componentPath)
	indexPath := filepath.Join(componentPath, "index.tsx")
	var issues []Issue

	if _, err := os.Stat(indexPath); err == nil {
		content, err := ioutil.ReadFile(indexPath)
		if err == nil {
			scanner := bufio.NewScanner(strings.NewReader(string(content)))
			lineNumber := 1
			for scanner.Scan() {
				line := scanner.Text()
				for _, config := range patternConfigs {
					issues = append(issues, findIssuesInLine(line, lineNumber, config)...)
				}
				lineNumber++
			}
		}
	}

	return ComponentCheck{
		Name:   name,
		Path:   componentPath,
		Issues: issues,
	}
}

func scanDirectory(dir string) []ComponentCheck {
	var results []ComponentCheck
	entries, err := ioutil.ReadDir(dir)
	if err != nil {
		return results
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		itemPath := filepath.Join(dir, entry.Name())
		indexPath := filepath.Join(itemPath, "index.tsx")

		if _, err := os.Stat(indexPath); err == nil {
			results = append(results, checkComponentStructure(itemPath))
		} else {
			results = append(results, scanDirectory(itemPath)...)
		}
	}

	return results
}

func buildFindCommand(config StructureConfig) string {
	excludeFlags := make([]string, len(config.ExcludeFlags))
	for i, path := range config.ExcludeFlags {
		excludeFlags[i] = fmt.Sprintf("! -path \"%s\"", path)
	}
	return fmt.Sprintf("find %s -type d -mindepth 1 -maxdepth 4 %s",
		config.BaseDir, strings.Join(excludeFlags, " "))
}

func checkFolderStructure(projectType ProjectType) []FolderIssue {
	var allFolderIssues []FolderIssue
	config := structureConfigs[projectType]
	seenPairs := make(map[string]bool)

	cmd := buildFindCommand(config)
	output, err := exec.Command("sh", "-c", cmd).Output()
	if err != nil {
		color.Red("Error checking %s structure: %v", projectType, err)
		return allFolderIssues
	}

	currentDirs := strings.Split(strings.TrimSpace(string(output)), "\n")
	for _, dir := range currentDirs {
		if dir == "" {
			continue
		}

		dirLower := strings.ToLower(dir)
		for _, protectedDir := range config.ProtectedDirs {
			protectedDirLower := strings.ToLower(protectedDir)

			if dirLower == protectedDirLower {
				continue
			}

			dirLastPart := filepath.Base(dirLower)
			protectedLastPart := filepath.Base(protectedDirLower)
			if dirLastPart != protectedLastPart {
				continue
			}

			// Skip if current directory is in protected dirs
			isProtected := false
			for _, pd := range config.ProtectedDirs {
				if dir == pd {
					isProtected = true
					break
				}
			}
			if isProtected {
				continue
			}

			fullKeyPair := dir + "->" + protectedDir
			if !seenPairs[fullKeyPair] {
				seenPairs[fullKeyPair] = true
				seenPairs[protectedDir+"->"+dir] = true
				allFolderIssues = append(allFolderIssues, FolderIssue{
					Path:         dir,
					OriginalPath: protectedDir,
					Type:         "duplicate",
				})
				color.Red("Duplicate directory found: %s", fullKeyPair)
			}
		}
	}

	return allFolderIssues
}

func printResults(results []ComponentCheck, folderIssues []FolderIssue, showSummary bool) bool {
	cleanComponents := make([]ComponentCheck, 0)
	for _, r := range results {
		if len(r.Issues) == 0 {
			cleanComponents = append(cleanComponents, r)
		}
	}

	if showSummary {
		fmt.Println(color.New(color.Bold).Sprint("\n🔍 Structure Check Results\n"))

		if len(cleanComponents) > 0 {
			color.Green("\n✅ Properly Structured Components (%d):", len(cleanComponents))
			for _, c := range cleanComponents {
				fmt.Printf("   %s\n", c.Name)
			}
			fmt.Println()
		}

		if len(cleanComponents) > 0 {
			color.Green("\n✨ All %d items are clean!\n", len(cleanComponents))
		}
	}

	totalIssues := 0
	for _, r := range results {
		totalIssues += len(r.Issues)
	}
	totalIssues += len(folderIssues)

	if totalIssues > 0 {
		fmt.Printf("\nFound %d issues in %d components\n", totalIssues, len(results))

		// Print component issues
		for _, check := range results {
			if len(check.Issues) > 0 {
				fmt.Printf("\nIn %s:\n", check.Path)
				for _, issue := range check.Issues {
					color.Yellow("  Line %d: %s", issue.Line, issue.Content)
				}
			}
		}

		// Print folder issues
		if len(folderIssues) > 0 {
			fmt.Println("\nFolder Structure Issues:")
			for _, issue := range folderIssues {
				color.Yellow("  Duplicate folder: %s should be in %s",
					strings.TrimPrefix(issue.Path, "./"),
					strings.TrimPrefix(issue.OriginalPath, "./"))
			}
		}

		color.Yellow("\n⚠️  Structure issues found. Please fix them before proceeding.\n")
	}

	return totalIssues > 0
}

func main() {
	color.New(color.Bold).Println("🚀 Starting structure checks...\n")

	// Run component checks (frontend only)
	var componentResults []ComponentCheck
	for _, dir := range componentDirs {
		fullPath := filepath.Join(".", dir)
		if _, err := os.Stat(fullPath); err == nil {
			componentResults = append(componentResults, scanDirectory(fullPath)...)
		} else {
			color.Red("Directory not found: %s", dir)
		}
	}

	// Check frontend structure
	color.Yellow("\n=== Checking Frontend Structure ===")
	frontendFolderIssues := checkFolderStructure(Frontend)

	// Check backend structure
	color.Yellow("\n=== Checking Backend Structure ===")
	backendFolderIssues := checkFolderStructure(Backend)

	// Combine folder issues
	allFolderIssues := append(frontendFolderIssues, backendFolderIssues...)

	// Print results and get issues status
	hasIssues := printResults(componentResults, allFolderIssues, true)

	// Exit with appropriate code
	if hasIssues {
		os.Exit(1)
	}
}
