import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { FileIssue, formatIssueGroup, formatSummary } from './utils/formatting';

const COMPONENT_DIRS = ['src/components', 'src/screens'];

// Issue type definitions
type IssueType = 'logic' | 'style' | 'type';

interface Issue {
  content: string;
  line: number;
  type: IssueType;
}

interface ComponentCheck {
  name: string;
  path: string;
  issues: Issue[];
}

interface PatternConfig {
  type: IssueType;
  patterns: RegExp[];
  contentPrefix?: string;
}

// Pattern configurations
const PATTERN_CONFIGS: PatternConfig[] = [
  {
    type: 'logic',
    patterns: [
      // Functions with implementation
      /function\s+\w+\s*\([^)]*\)\s*{[^}]+}/,
      // Arrow functions with implementation
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/,
      // Constants (except style-related)
      /const\s+[A-Z_]+\s*=/,
      // Data transformation
      /\.map\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)/,
      /\.filter\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)/,
      /\.reduce\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)/,
      // Complex state updates
      /setState\s*\(\s*\([^)]*\)\s*=>\s*{[^}]+}\)/,
      // API calls or data fetching
      /\.(get|post|put|delete|fetch)\s*\(/,
      // Complex calculations
      /Math\.((?!min|max|round|floor|ceil)\w+)/,
      // Event handlers with complex logic
      /handle\w+\s*=\s*\([^)]*\)\s*=>\s*{[^}]+}/,
      // Utility functions
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*[^;]+;/
    ]
  },
  {
    type: 'style',
    patterns: [
      // Styled-components or emotion definitions
      /styled\.[a-zA-Z]+`[^`]*`/,
      /styled\([^)]+\)`[^`]*`/,
      // StyleSheet.create in component
      /StyleSheet\.create\({[^}]+}\)/,
      // Inline style objects
      /style=\{\s*{[^}]+}\s*\}/,
      // Emotion styled usage
      /emotion\/styled/,
      // Style objects defined in component
      /const\s+styles\s*=\s*{[^}]+}/,
      // Inline className with template literal
      /className={\`[^}]+\`}/,
      // Style-related constants
      /const\s+[A-Z_]+(?:_STYLE|_COLOR|_SIZE|_MARGIN|_PADDING|_WIDTH|_HEIGHT)\s*=\s*{[^}]+}/,
      // Style imports from wrong locations
      /import\s+{[^}]*}\s+from\s+['"]styled-components['"]/,
      /import\s+{[^}]*}\s+from\s+['"]@emotion[^'"]*['"]/,
      /import\s+{[^}]*}\s+from\s+['"](?!\.\/styles)[^'"]*style[^'"]*['"]/
    ],
    contentPrefix: 'Style in component: '
  },
  {
    type: 'type',
    patterns: [
      // Interface definitions
      /interface\s+[A-Z]\w*\s*{[^}]+}/,
      // Type aliases
      /type\s+[A-Z]\w*\s*=\s*/,
      // Enum definitions
      /enum\s+[A-Z]\w*\s*{[^}]+}/,
      // Generic type definitions
      /type\s+[A-Z]\w*<[^>]+>\s*=/,
      // Inline parameter interface definitions
      /\(\s*{\s*[a-zA-Z]+\s*:\s*[a-zA-Z<>[\]]+[^}]*}\s*\)\s*=>/,
      // Inline return type definitions
      /\)\s*:\s*{\s*[a-zA-Z]+\s*:\s*[a-zA-Z<>[\]]+[^}]*}\s*=>/
    ],
    contentPrefix: 'Type in component: '
  }
];

function findIssuesInLine(line: string, lineNumber: number, config: PatternConfig): Issue[] {
  return config.patterns
    .filter(pattern => pattern.test(line))
    .map(() => ({
      content: config.contentPrefix ? `${config.contentPrefix}${line.trim()}` : line.trim(),
      line: lineNumber,
      type: config.type
    }));
}

function issueToFileIssue(issue: Issue, componentPath: string): FileIssue {
  return {
    filePath: path.join(componentPath, 'index.tsx'),
    line: issue.line,
    column: 1,
    code: issue.type.toUpperCase(),
    message: issue.content.replace(/^(Logic|Style|Type) in component: /, '')
  };
}

function checkComponentStructure(componentPath: string): ComponentCheck {
  const name = path.basename(componentPath);
  const indexPath = path.join(componentPath, 'index.tsx');
  const issues: Issue[] = [];
  
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      PATTERN_CONFIGS.forEach(config => {
        issues.push(...findIssuesInLine(line, lineNumber, config));
      });
    });
  }

  return { name, path: componentPath, issues };
}

function scanDirectory(dir: string): ComponentCheck[] {
  const results: ComponentCheck[] = [];
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      if (fs.existsSync(path.join(itemPath, 'index.tsx'))) {
        results.push(checkComponentStructure(itemPath));
      } else {
        results.push(...scanDirectory(itemPath));
      }
    }
  });

  return results;
}

function printResults(results: ComponentCheck[], showSummary: boolean = false): boolean {
  console.log(chalk.bold('\n🔍 Component Structure Check Results\n'));

  // First show all valid components
  const validComponents = results.filter(result => result.issues.length === 0);
  if (validComponents.length > 0) {
    console.log(chalk.green.bold('✅ Properly Structured Components:'));
    validComponents.forEach(result => {
      console.log(chalk.green(`   ${result.name}`));
    });
    console.log('');
  }

  // Then show components with issues
  const componentsWithIssues = results.filter(result => result.issues.length > 0);
  if (componentsWithIssues.length > 0) {
    const allIssues = componentsWithIssues.flatMap(result => 
      result.issues.map(issue => issueToFileIssue(issue, result.path))
    );

    console.log(formatSummary(allIssues.length));
    console.log(formatIssueGroup(allIssues));
  }

  if (showSummary && componentsWithIssues.length > 0) {
    console.log(chalk.cyan.bold('\n💡 Tips:'));
    console.log(chalk.cyan('  • Move complex functions to scripts.ts'));
    console.log(chalk.cyan('  • Keep only JSX, props handling, and basic hooks in index.tsx'));
    console.log(chalk.cyan('  • Extract data transformations and utilities to scripts.ts'));
    console.log(chalk.cyan('  • Move all styles to ./styles.ts'));
    console.log(chalk.cyan('  • Import styles from ./styles'));
    console.log(chalk.cyan('  • Consider creating types.ts for complex prop types\n'));
  }

  return componentsWithIssues.length > 0;
}

// Run the check
console.log(chalk.bold('🚀 Starting component structure check...\n'));

// Collect all results
const allResults: ComponentCheck[] = [];
COMPONENT_DIRS.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    allResults.push(...scanDirectory(fullPath));
  } else {
    console.log(chalk.red(`Directory not found: ${dir}`));
  }
});

// Print results and exit
const hasIssues = printResults(allResults, true);
process.exit(hasIssues ? 1 : 0); 