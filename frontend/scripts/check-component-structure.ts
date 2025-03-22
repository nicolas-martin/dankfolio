import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { FileIssue, formatIssueGroup, formatSummary, formatFinalSummary } from './utils/formatting';
// command for folder structure
// frontend structure check
// backend structure check


const COMPONENT_DIRS = ['src/components', 'src/screens'];

const FRONTEND_EXCLUDE_FLAGS = [
  './frontend/node_modules/*', 
  './frontend/ios/*', 
  './frontend/.*'
];

const BACKEND_EXCLUDE_FLAGS = [
  './backend/keys/*',
  './backend/scripts/*',
  './backend/internal/model/*',
  './backend/cmd/*'
];
// Protected directories that should only exist in specific locations
const FRONTEND_PROTECTED_DIRS = [
  './frontend/scripts',
  './frontend/scripts/utils',
  './frontend/assets',
  './frontend/assets/icons',
  './frontend/src',
  './frontend/src/types',
  './frontend/src/navigation',
  './frontend/src/navigation/screens',
  './frontend/src/utils',
  './frontend/src/screens',
  './frontend/src/screens/Home',
  './frontend/src/screens/Trade',
  './frontend/src/screens/CoinDetail',
  './frontend/src/screens/components',
  './frontend/src/screens/Profile',
  './frontend/src/components',
  './frontend/src/components/Home',
  './frontend/src/components/Home/CoinCard',
  './frontend/src/components/Trade',
  './frontend/src/components/Trade/TradeDetails',
  './frontend/src/components/Trade/SwapButton',
  './frontend/src/components/Trade/CoinSelector',
  './frontend/src/components/Trade/TradeButton',
  './frontend/src/components/Chart',
  './frontend/src/components/Chart/CustomTooltip',
  './frontend/src/components/Chart/CoinInfo',
  './frontend/src/components/Chart/CoinChart',
  './frontend/src/components/Common',
  './frontend/src/components/Common/Toast',
  './frontend/src/components/Common/TopBar',
  './frontend/src/components/Common/BackButton',
  './frontend/src/components/Common/PlatformImage',
  './frontend/src/components/CoinDetails',
  './frontend/src/components/CoinDetails/PriceDisplay',
  './frontend/src/services'
];

const BACKEND_PROTECTED_DIRS = [
  './backend/cmd',
  './backend/internal',
  './backend/internal/middleware',
  './backend/internal/model',
  './backend/internal/wallet',
  './backend/internal/api',
  './backend/internal/service',
  './backend/internal/service/trade',
  './backend/internal/service/solana',
  './backend/internal/service/price',
  './backend/internal/service/coin',
  './backend/internal/service/wallet',
  './backend/scripts',
  './backend/keys'
];

type ProjectType = 'frontend' | 'backend';

interface StructureConfig {
  protectedDirs: string[];
  baseDir: string;
  buildFindCommand(): string;
}

const STRUCTURE_CONFIGS: Record<ProjectType, StructureConfig> = {
  frontend: {
    protectedDirs: FRONTEND_PROTECTED_DIRS,
    baseDir: './frontend',
    buildFindCommand: () => {
      const excludeFlags = FRONTEND_EXCLUDE_FLAGS
        .map(path => `! -path "${path}"`)
        .join(' ');
      return `find ./frontend -type d -mindepth 1 -maxdepth 4 ${excludeFlags}`;
    }
  },
  backend: {
    protectedDirs: BACKEND_PROTECTED_DIRS,
    baseDir: './backend',
    buildFindCommand: () => {
      const excludeFlags = BACKEND_EXCLUDE_FLAGS
        .map(path => `! -path "${path}"`)
        .join(' ');
      return `find ./backend -type d -mindepth 1 -maxdepth 4 ${excludeFlags}`;
    }
  }
};

// Issue type definitions
type IssueType = 'logic' | 'style' | 'type' | 'structure';

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

interface FolderIssue {
  path: string;
  originalPath: string;
  type: 'duplicate';
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

function printResults(results: ComponentCheck[], folderIssues: FolderIssue[], showSummary: boolean = false): boolean {
  console.log(chalk.bold('\n🔍 Structure Check Results\n'));

  // First show all valid components
  const validComponents = results.filter(result => result.issues.length === 0);
  if (validComponents.length > 0) {
    console.log(chalk.green.bold(`✅ Properly Structured Components (${validComponents.length}):`));
    validComponents.forEach(result => {
      console.log(chalk.green(`   ${result.name}`));
    });
    console.log('');
  }

  // Then show components with issues
  const componentsWithIssues = results.filter(result => result.issues.length > 0);
  let hasIssues = false;

  if (componentsWithIssues.length > 0) {
    hasIssues = true;
    const allIssues = componentsWithIssues.flatMap(result =>
      result.issues.map(issue => issueToFileIssue(issue, result.path))
    );

    console.log(formatSummary(allIssues.length, validComponents.length));
    console.log(formatIssueGroup(allIssues));
  }

  // Show folder structure issues
  if (folderIssues.length > 0) {
    hasIssues = true;
    console.log(chalk.yellow.bold('\n⚠️  Folder Structure Issues:'));
    console.log(formatIssueGroup(folderIssues.map(folderIssueToFileIssue)));
  }

  if (showSummary && (componentsWithIssues.length > 0 || folderIssues.length > 0)) {
    console.log(chalk.cyan.bold('\n💡 Tips:'));

    if (componentsWithIssues.length > 0) {
      console.log(chalk.cyan('Component Structure:'));
      console.log(chalk.cyan('  • Move complex functions to scripts.ts'));
      console.log(chalk.cyan('  • Keep only JSX, props handling, and basic hooks in index.tsx'));
      console.log(chalk.cyan('  • Extract data transformations and utilities to scripts.ts'));
      console.log(chalk.cyan('  • Move all styles to ./styles.ts'));
      console.log(chalk.cyan('  • Import styles from ./styles'));
      console.log(chalk.cyan('  • Consider creating types.ts for complex prop types'));
    }

    if (folderIssues.length > 0) {
      if (componentsWithIssues.length > 0) console.log('');
      console.log(chalk.cyan('Folder Structure:'));
      console.log(chalk.cyan('  • Keep folders in their designated locations'));
      console.log(chalk.cyan('  • Frontend folders should be under src/'));
      console.log(chalk.cyan('  • Backend folders should follow internal/ structure'));
      console.log(chalk.cyan('  • Avoid creating duplicate folders in different locations'));
    }
    console.log('');
  }

  // Add final summary with structure issues included
  const summaryItems = [
    { label: 'clean components', count: validComponents.length },
    { label: 'components with issues', count: componentsWithIssues.length },
    { label: 'structure issues', count: folderIssues.length }
  ];
  console.log(formatFinalSummary(summaryItems, validComponents.length));

  return hasIssues;
}

function folderIssueToFileIssue(issue: FolderIssue): FileIssue {
  return {
    filePath: issue.path,
    line: 1,
    column: 1,
    code: 'STRUCTURE',
    message: `Duplicate folder found. Should be in: ${issue.originalPath}`
  };
}

// Run the check
console.log(chalk.bold('🚀 Starting structure checks...\n'));

function checkAllComponentStructure(): ComponentCheck[] {
  const allResults: ComponentCheck[] = [];

  COMPONENT_DIRS.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (fs.existsSync(fullPath)) {
      allResults.push(...scanDirectory(fullPath));
    } else {
      console.log(chalk.red(`Directory not found: ${dir}`));
    }
  });

  return allResults;
}

function checkFolderStructure(projectType: ProjectType): FolderIssue[] {
  const allFolderIssues: FolderIssue[] = [];
  const config = STRUCTURE_CONFIGS[projectType];
  
  // Get the project root by going up from frontend/scripts to dankfolio root
  const scriptDir = process.cwd();
  const projectRoot = path.resolve(scriptDir, '..');
  
  console.log(chalk.blue(`\n📁 Checking ${projectType} directory structure...`));
  console.log(chalk.gray('Protected directories:'));
  config.protectedDirs.forEach(dir => console.log(chalk.gray(`  ${dir}`)));

  const fullBaseDir = path.join(projectRoot, projectType);
  console.log(chalk.gray(`\nScript directory: ${scriptDir}`));
  console.log(chalk.gray(`Project root: ${projectRoot}`));
  console.log(chalk.gray(`Full base directory: ${fullBaseDir}`));

  if (fs.existsSync(fullBaseDir)) {
    // Use the buildFindCommand function to get the command
    const cmd = config.buildFindCommand();
    console.log(chalk.yellow('\nBuilt find command:'), cmd);

    try {
      console.log(chalk.gray('\nExecuting command...'));
      const output = require('child_process').execSync(cmd, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: projectRoot  // Execute from dankfolio root
      });

      if (!output) {
        console.log(chalk.yellow('No directories found.'));
        return allFolderIssues;
      }

      const currentDirs = output.trim().split('\n').filter(Boolean);
      
      console.log(chalk.gray('\nFound directories:'));
      currentDirs.forEach(dir => console.log(chalk.gray(`  ${dir}`)));

      // Compare current structure
      console.log(chalk.gray('\nChecking for duplicates...'));
      currentDirs.forEach(dir => {
        const dirName = path.basename(dir);
        console.log(chalk.gray(`\nChecking directory: ${dir} (basename: ${dirName})`));

        // Check if this directory name matches a protected directory
        config.protectedDirs.forEach(protectedDir => {
          const protectedName = path.basename(protectedDir);
          console.log(chalk.gray(`  Comparing with protected dir: ${protectedDir} (basename: ${protectedName})`));

          if (dirName === protectedName && !dir.endsWith(protectedDir)) {
            console.log(chalk.red(`    ⚠️  Found duplicate in wrong location:`));
            console.log(chalk.red(`      Found: ${dir}`));
            console.log(chalk.red(`      Should be in: ${protectedDir}`));
            allFolderIssues.push({
              path: dir,
              originalPath: protectedDir,
              type: 'duplicate'
            });
          }
        });
      });

      console.log(chalk.gray('\nFound issues:'), allFolderIssues.length);
      allFolderIssues.forEach(issue => {
        console.log(chalk.yellow(`  - ${issue.path} (should be in ${issue.originalPath})`));
      });

    } catch (error) {
      console.error(chalk.red(`Error checking ${projectType} structure:`), error);
      if (error instanceof Error) {
        console.error(chalk.red('Error details:'), error.message);
        if ('stdout' in error) console.error(chalk.red('stdout:'), (error as any).stdout);
        if ('stderr' in error) console.error(chalk.red('stderr:'), (error as any).stderr);
      }
    }
  } else {
    console.log(chalk.red(`Base directory not found: ${fullBaseDir}`));
  }

  return allFolderIssues;
}

try {
  // Run component checks (frontend only)
  const componentResults = checkAllComponentStructure();

  // Run structure checks for both frontend and backend
  const frontendFolderIssues = checkFolderStructure('frontend');
  const backendFolderIssues = checkFolderStructure('backend');

  // Combine folder issues
  const allFolderIssues = [...frontendFolderIssues, ...backendFolderIssues];

  // Print combined results
  const hasIssues = printResults(componentResults, allFolderIssues, true);

  if (hasIssues) {
    console.log(chalk.yellow('\n⚠️  Structure issues found. Please fix them before proceeding.\n'));
  }

  process.exit(hasIssues ? 1 : 0);
} catch (error) {
  console.error(chalk.red('\n❌ Error running structure check:'), error);
  process.exit(1);
}