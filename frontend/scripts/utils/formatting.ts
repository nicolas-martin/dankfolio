import chalk from 'chalk';
import path from 'path';

export interface FileIssue {
  filePath: string;
  line: number;
  column: number;
  code: string | number;
  message: string;
}

export function formatIssue(issue: FileIssue): string {
  const relativePath = path.relative(process.cwd(), issue.filePath);
  
  return `${chalk.white.bold(relativePath)}\n` +
         `    ${chalk.yellow(`${issue.code}: ${issue.message}`)}\n`+
         `    ${chalk.gray(`vscode://file/${issue.filePath}:${issue.line}:${issue.column}`)}\n`;
}

export function groupIssuesByTypeAndFile(issues: FileIssue[]): { [key: string]: { [key: string]: FileIssue[] } } {
  return issues.reduce((acc, issue) => {
    const type = issue.code.toString().split(':')[0];
    const fileName = issue.filePath;
    if (!acc[type]) acc[type] = {};
    if (!acc[type][fileName]) acc[type][fileName] = [];
    acc[type][fileName].push(issue);
    return acc;
  }, {} as { [key: string]: { [key: string]: FileIssue[] } });
}

export function formatIssueGroup(issues: FileIssue[]): string {
  const grouped = groupIssuesByTypeAndFile(issues);
  let output = '\n';

  Object.entries(grouped).forEach(([type, fileIssues]) => {
    const issueCount = Object.values(fileIssues).flat().length;
    // Color-code different issue types
    const typeColor = 'yellow'
    
    output += chalk[typeColor].bold(`\n${type} Issues (${issueCount}):\n`);
    
    Object.entries(fileIssues).forEach(([filePath, issues]) => {
      const relativePath = path.relative(process.cwd(), filePath);
      output += chalk.white.bold(`\n  📄 ${relativePath}\n`);
      issues.forEach(issue => {
        const vscodePath = `vscode://file/${filePath}:${issue.line}:${issue.column}`;
        output += chalk.gray(`      ${vscodePath}\n`);
        output += `      ${issue.message}\n`;
      });
    });
    output += '\n' + chalk.gray('─'.repeat(80)) + '\n';
  });

  return output;
}

export function formatSummary(issueCount: number, cleanCount?: number): string {
  if (issueCount === 0) {
    return chalk.green.bold(`✨ All ${cleanCount} files are clean!\n`);
  }
  return chalk.yellow.bold(`⚠️  Found ${issueCount} ${issueCount === 1 ? 'issue' : 'issues'} across ${cleanCount} clean files:\n\n`);
}

export function formatFinalSummary(cleanFiles: number, filesWithIssues: number): string {
  const totalFiles = cleanFiles + filesWithIssues;
  return '\n' + chalk.bold('📊 Final Stats:\n') +
    chalk.green(`  ✅ ${cleanFiles} files passing`) + chalk.gray(` (${Math.round(cleanFiles/totalFiles*100)}%)\n`) +
    chalk.yellow(`  ⚠️  ${filesWithIssues} files with issues`) + chalk.gray(` (${Math.round(filesWithIssues/totalFiles*100)}%)\n`) +
    chalk.gray(`  📁 ${totalFiles} total files\n`);
} 