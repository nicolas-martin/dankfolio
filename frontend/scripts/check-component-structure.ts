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

  // First show all valid components
  const validComponents = results.filter(result => 
    !result.hasLogicInComponent && !result.hasStyleIssues && !result.hasTypeIssues
  );
  
  if (validComponents.length > 0) {
    console.log(chalk.green.bold('✅ Properly Structured Components:'));
    validComponents.forEach(result => {
      console.log(chalk.green(`   ${result.name}`));
    });
    console.log(''); // Empty line after valid components
  }

  // Then show components with issues
  const componentsWithIssues = results.filter(result => 
    result.hasLogicInComponent || result.hasStyleIssues || result.hasTypeIssues
  );
  
  if (componentsWithIssues.length > 0) {
    console.log(chalk.yellow.bold('⚠️  Components Needing Attention:\n'));
    
    componentsWithIssues.forEach(result => {
      const fullPath = path.join(result.path, 'index.tsx');
      const relativePath = fullPath.split('src/')[1];
      
      // Component name and path
      console.log(chalk.yellow.bold(`${result.name} `));
      console.log(chalk.gray(`   ${fullPath}`));
      
      // Logic issues
      if (result.hasLogicInComponent) {
        console.log(chalk.yellow('\n   Business Logic (move to scripts.ts):'));
        result.logicFound.forEach(logic => {
          console.log(chalk.yellow(`     • ${logic}`));
        });
      }
      
      // Style issues
      if (result.hasStyleIssues) {
        console.log(chalk.yellow('\n   Styles (move to styles.ts):'));
        result.styleIssues.forEach(style => {
          console.log(chalk.yellow(`     • ${style}`));
        });
      }

      // Type issues
      if (result.hasTypeIssues) {
        console.log(chalk.yellow('\n   Types (move to types.ts):'));
        result.typeIssues.forEach(type => {
          console.log(chalk.yellow(`     • ${type}`));
        });
      }
      
      console.log('\n' + '─'.repeat(80) + '\n'); // Separator between components
    });
  }

  if (showSummary) {
    if (componentsWithIssues.length === 0) {
      console.log(chalk.green.bold('\n✨ All components are properly structured!\n'));
    } else {
      console.log(chalk.cyan.bold('\n💡 Tips:'));
      console.log(chalk.cyan('  • Move complex functions to scripts.ts'));
      console.log(chalk.cyan('  • Keep only JSX, props handling, and basic hooks in index.tsx'));
      console.log(chalk.cyan('  • Extract data transformations and utilities to scripts.ts'));
      console.log(chalk.cyan('  • Move all styles to ./styles.ts'));
      console.log(chalk.cyan('  • Import styles from ./styles'));
      console.log(chalk.cyan('  • Consider creating types.ts for complex prop types\n'));
    }
  }

  return componentsWithIssues.length > 0;
}

// Run the check
console.log(chalk.bold('🚀 Starting component structure check...\n'));

// Collect all results first
const allResults: ComponentCheck[] = [];
COMPONENT_DIRS.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    allResults.push(...scanDirectory(fullPath));
  } else {
    console.log(chalk.red(`Directory not found: ${dir}`));
  }
});

// Print all results together
const hasIssues = printResults(allResults, true);

// Process exit code based on whether there were issues
process.exit(hasIssues ? 1 : 0); 