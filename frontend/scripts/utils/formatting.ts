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
  
  return `${chalk.yellow.bold(relativePath)}\n` +
         `    ${chalk.gray(`vscode://file/${issue.filePath}:${issue.line}:${issue.column}`)}\n` +
         `    ${chalk.yellow(`${issue.code}: ${issue.message}`)}\n`;
}

export function formatIssueGroup(issues: FileIssue[]): string {
  const groupedByFile = issues.reduce((acc, issue) => {
    const fileName = issue.filePath;
    if (!acc[fileName]) acc[fileName] = [];
    acc[fileName].push(issue);
    return acc;
  }, {} as { [key: string]: FileIssue[] });

  let output = '';
  Object.entries(groupedByFile).forEach(([_, fileIssues]) => {
    fileIssues.forEach(issue => {
      output += formatIssue(issue);
    });
    output += '─'.repeat(80) + '\n\n';
  });

  return output;
}

export function formatSummary(issueCount: number): string {
  if (issueCount === 0) {
    return chalk.green.bold('✨ No issues found!\n');
  }
  return chalk.yellow.bold(`⚠️  Found ${issueCount} issues:\n\n`);
} 