import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

function getFilesRecursively(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  const code = diagnostic.code;
  
  if (diagnostic.file) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    const filePath = diagnostic.file.fileName;
    const relativePath = path.relative(process.cwd(), filePath);
    
    return `${chalk.yellow.bold(relativePath)}\n` +
           `    ${chalk.gray(`vscode://file/${filePath}:${line + 1}:${character + 1}`)}\n` +
           `    ${chalk.yellow(`TS${code}: ${message}`)}\n`;
  }
  
  return `${chalk.yellow(`TS${code}: ${message}`)}\n`;
}

function checkDiagnostics() {
  // Get TypeScript configuration
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('Could not find tsconfig.json');
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  // check if the parsedconfig exists
  if (!parsedConfig) {
    throw new Error('Could not parse tsconfig.json');
  }

  // Add additional compiler options
  const compilerOptions: ts.CompilerOptions = {
    ...parsedConfig.options,
  };

  // Create program
  const program = ts.createProgram({
    rootNames: getFilesRecursively(path.join(process.cwd(), 'src')),
    options: compilerOptions
  });

  // Get diagnostics with all checks enabled
  const allDiagnostics = ts.getPreEmitDiagnostics(program);

  if (allDiagnostics.length === 0) {
    console.log(chalk.green.bold('✨ No TypeScript warnings or errors found!\n'));
    return false;
  }

  console.log(chalk.yellow.bold(`⚠️  Found ${allDiagnostics.length} TypeScript warnings/errors:\n`));

  // Group diagnostics by file
  const groupedDiagnostics = allDiagnostics.reduce((acc, diagnostic) => {
    const fileName = diagnostic.file?.fileName || 'Global';
    if (!acc[fileName]) acc[fileName] = [];
    acc[fileName].push(diagnostic);
    return acc;
  }, {} as { [key: string]: ts.Diagnostic[] });

  // Print diagnostics
  Object.entries(groupedDiagnostics).forEach(([_, fileDiagnostics]) => {
    fileDiagnostics.forEach(diagnostic => {
      console.log(formatDiagnostic(diagnostic));
    });
    console.log('─'.repeat(80) + '\n');
  });

  return true;
}

// Run the check
console.log(chalk.bold('🔍 Starting TypeScript diagnostic check...\n'));

try {
  const hasIssues = checkDiagnostics();
  process.exit(hasIssues ? 1 : 0);
} catch (error) {
  console.error(chalk.red('Error running diagnostic check:'), error);
  process.exit(1);
} 