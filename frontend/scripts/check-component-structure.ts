import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const COMPONENT_DIRS = ['src/components', 'src/screens'];

// Patterns that indicate business logic that should be in scripts.ts
const LOGIC_PATTERNS = [
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
];

// Pattern to find style-related imports
const STYLE_IMPORT_PATTERN = /import\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/g;

// Patterns to find style issues
const STYLE_PATTERNS = [
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
  // Style-related constants defined in component
  /const\s+[A-Z_]+(?:_STYLE|_COLOR|_SIZE|_MARGIN|_PADDING|_WIDTH|_HEIGHT)\s*=\s*{[^}]+}/
];

// Patterns to find type definitions that should be in types.ts
const TYPE_PATTERNS = [
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
];

interface ComponentCheck {
  name: string;
  path: string;
  hasLogicInComponent: boolean;
  hasStyleIssues: boolean;
  hasTypeIssues: boolean;
  logicFound: string[];
  styleIssues: string[];
  typeIssues: string[];
}

function checkComponentStructure(componentPath: string): ComponentCheck {
  const name = path.basename(componentPath);
  const indexPath = path.join(componentPath, 'index.tsx');
  let hasLogicInComponent = false;
  let hasStyleIssues = false;
  let hasTypeIssues = false;
  let logicFound = new Set<string>();
  let styleIssues = new Set<string>();
  let typeIssues = new Set<string>();
  
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    // Check each logic pattern
    LOGIC_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        hasLogicInComponent = true;
        logicFound.add(matches[0].trim().split('\n')[0]); // Get first line of match
      }
    });

    // Check style imports
    let match;
    while ((match = STYLE_IMPORT_PATTERN.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.includes('styled-components') || 
          importPath.includes('@emotion') ||
          (importPath.includes('style') && !importPath.includes('./styles'))) {
        hasStyleIssues = true;
        styleIssues.add(`Import: ${match[0].trim()}`);
      }
    }

    // Check for style patterns
    STYLE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        hasStyleIssues = true;
        matches.forEach(match => {
          styleIssues.add(`Style in component: ${match.trim()}`);
        });
      }
    });

    // Check for type patterns
    TYPE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        hasTypeIssues = true;
        matches.forEach(match => {
          // Clean up the match to show just the essential part
          const cleanMatch = match.trim()
            .split('\n')[0]  // Get first line
            .replace(/{\s*$/, '{...}')  // Replace complex type bodies with {...}
            .substring(0, 100);  // Limit length
          typeIssues.add(`Type in component: ${cleanMatch}`);
        });
      }
    });
  }

  return {
    name,
    path: componentPath,
    hasLogicInComponent,
    hasStyleIssues,
    hasTypeIssues,
    logicFound: Array.from(logicFound),
    styleIssues: Array.from(styleIssues),
    typeIssues: Array.from(typeIssues)
  };
}

function scanDirectory(dir: string): ComponentCheck[] {
  const results: ComponentCheck[] = [];
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // Check if it's a component directory (has index.tsx)
      if (fs.existsSync(path.join(itemPath, 'index.tsx'))) {
        results.push(checkComponentStructure(itemPath));
      } else {
        // Recurse into subdirectories
        results.push(...scanDirectory(itemPath));
      }
    }
  });

  return results;
}

function printResults(results: ComponentCheck[], showSummary: boolean = false): boolean {
  console.log(chalk.bold('\n🔍 Component Structure Check Results\n'));

  let hasIssues = false;

  results.forEach(result => {
    const hasAnyIssues = result.hasLogicInComponent || result.hasStyleIssues || result.hasTypeIssues;
    
    if (hasAnyIssues) {
      hasIssues = true;
      const fullPath = path.join(result.path, 'index.tsx');
      const relativePath = fullPath.split('src/')[1];
      console.log(chalk.yellow(`⚠️ Found issue in ${result.name} in ${relativePath}`));
      console.log(chalk.gray(`    ${fullPath}`));
      
      if (result.hasLogicInComponent) {
        console.log(chalk.yellow('    Logic that should be in scripts.ts:'));
        result.logicFound.forEach(logic => {
          console.log(chalk.yellow(`      - ${logic}`));
        });
      }
      
      if (result.hasStyleIssues) {
        console.log(chalk.yellow('    Style imports that should be in ./styles:'));
        result.styleIssues.forEach(style => {
          console.log(chalk.yellow(`      - ${style}`));
        });
      }

      if (result.hasTypeIssues) {
        console.log(chalk.yellow('    Types that should be in types.ts:'));
        result.typeIssues.forEach(type => {
          console.log(chalk.yellow(`      - ${type}`));
        });
      }
    } else {
      console.log(chalk.green(`✅ ${result.name} is properly structured`));
    }
    
    console.log(''); // Empty line between components
  });

  if (showSummary) {
    if (!hasIssues) {
      console.log(chalk.green.bold('✨ All components are properly structured!\n'));
    } else {
      console.log(chalk.yellow.bold('⚠️  Some components need attention\n'));
      console.log(chalk.cyan('💡 Tips:'));
      console.log(chalk.cyan('  - Move complex functions to scripts.ts'));
      console.log(chalk.cyan('  - Keep only JSX, props handling, and basic hooks in index.tsx'));
      console.log(chalk.cyan('  - Extract data transformations and utilities to scripts.ts'));
      console.log(chalk.cyan('  - Move all styles to ./styles.ts'));
      console.log(chalk.cyan('  - Import styles from ./styles'));
      console.log(chalk.cyan('  - Consider creating types.ts for complex prop types\n'));
    }
  }

  return hasIssues;
}

// Run the check
console.log(chalk.bold('🚀 Starting component structure check...\n'));

let anyIssues = false;
COMPONENT_DIRS.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    const results = scanDirectory(fullPath);
    anyIssues = printResults(results) || anyIssues;
  } else {
    console.log(chalk.red(`Directory not found: ${dir}`));
  }
});

// Show summary at the end if there were any issues
if (anyIssues) {
  console.log(chalk.yellow.bold('⚠️  Some components need attention\n'));
  console.log(chalk.cyan('💡 Tips:'));
  console.log(chalk.cyan('  - Move complex functions to scripts.ts'));
  console.log(chalk.cyan('  - Keep only JSX, props handling, and basic hooks in index.tsx'));
  console.log(chalk.cyan('  - Extract data transformations and utilities to scripts.ts'));
  console.log(chalk.cyan('  - Move all styles to ./styles.ts'));
  console.log(chalk.cyan('  - Import styles from ./styles'));
  console.log(chalk.cyan('  - Consider creating types.ts for complex prop types\n'));
} else {
  console.log(chalk.green.bold('✨ All components are properly structured!\n'));
} 