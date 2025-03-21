import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { FileIssue, formatIssueGroup, formatSummary } from './utils/formatting';

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

function diagnosticToFileIssue(diagnostic: ts.Diagnostic): FileIssue {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  
  if (diagnostic.file && diagnostic.start !== undefined) {
    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    return {
      filePath: diagnostic.file.fileName,
      line: line + 1,
      column: character + 1,
      code: `TS${diagnostic.code}`,
      message
    };
  }
  
  return {
    filePath: 'Global',
    line: 1,
    column: 1,
    code: `TS${diagnostic.code}`,
    message
  };
}

function checkDiagnostics() {
  // Get TypeScript configuration
  const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('Could not find tsconfig.json');
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
  if (!parsedConfig) {
    throw new Error('Could not parse tsconfig.json');
  }

  // Get all files
  const allFiles = getFilesRecursively(path.join(process.cwd(), 'src'));

  // Create program
  const program = ts.createProgram({
    rootNames: allFiles,
    options: parsedConfig.options
  });

  // Get diagnostics
  const allDiagnostics = ts.getPreEmitDiagnostics(program);
  const fileIssues = allDiagnostics.map(diagnosticToFileIssue);

  // Get files with no issues
  const filesWithIssues = new Set(fileIssues.map(issue => issue.filePath));
  const cleanFiles = allFiles.filter(file => !filesWithIssues.has(file));

  if (fileIssues.length === 0) {
    console.log(chalk.green.bold('✅ All TypeScript files are clean!\n'));
    allFiles.forEach(file => {
      console.log(chalk.green(`   ${path.relative(process.cwd(), file)}`));
    });
    console.log('');
    return false;
  }

  // Show clean files first if any exist
  if (cleanFiles.length > 0) {
    console.log(chalk.green.bold('✅ Files with no issues:'));
    cleanFiles.forEach(file => {
      console.log(chalk.green(`   ${path.relative(process.cwd(), file)}`));
    });
    console.log('');
  }

  console.log(formatSummary(fileIssues.length));
  console.log(formatIssueGroup(fileIssues));
  return true;
}

// Run the check
console.log(chalk.bold('🔍 Starting TypeScript diagnostic check...\n'));

try {
  const hasIssues = checkDiagnostics();
  if (hasIssues) {
    console.log(chalk.yellow('\n⚠️  TypeScript diagnostics issues found. Please fix them before proceeding.\n'));
  }else{
    console.log(chalk.green('\n✅ No TypeScript diagnostics issues found. All good!\n'));
  }

  process.exit(hasIssues ? 1 : 0);
} catch (error) {
  console.error(chalk.red('\n❌ Error running diagnostic check:'), error);
  process.exit(1);
} 