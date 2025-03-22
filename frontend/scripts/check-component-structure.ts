import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { FileIssue, formatIssueGroup, formatSummary } from './utils/formatting';

const COMPONENT_DIRS = ['src/components', 'src/screens'];

const FRONTEND_EXCLUDE_FLAGS = [
	'./frontend/node_modules/*',
	'./frontend/ios/*',
	'./frontend/.*',
	'./frontend/scripts/utils/*',
	'./frontend/src/utils/*',
];

const BACKEND_EXCLUDE_FLAGS = [
	'./backend/keys/*',
	'./backend/scripts/*',
	'./backend/internal/model/*',
	'./backend/cmd/*',
	'./backend/internal/service/wallet/*',
	'./backend/internal/wallet/*'
];
// Protected directories that should only exist in specific locations
const FRONTEND_PROTECTED_DIRS = [
	'./frontend/assets',
	'./frontend/assets/icons',
	'./frontend/ios',
	'./frontend/node_modules',
	'./frontend/src',
	'./frontend/src/components',
	'./frontend/src/components/chart',
	'./frontend/src/components/chart/coinchart',
	'./frontend/src/components/chart/coininfo',
	'./frontend/src/components/chart/customtooltip',
	'./frontend/src/components/coindetails',
	'./frontend/src/components/coindetails/pricedisplay',
	'./frontend/src/components/common',
	'./frontend/src/components/common/backbutton',
	'./frontend/src/components/common/platformimage',
	'./frontend/src/components/common/toast',
	'./frontend/src/components/common/topbar',
	'./frontend/src/components/home',
	'./frontend/src/components/home/coincard',
	'./frontend/src/components/trade',
	'./frontend/src/components/trade/coinselector',
	'./frontend/src/components/trade/swapbutton',
	'./frontend/src/components/trade/tradebutton',
	'./frontend/src/components/trade/tradedetails',
	'./frontend/src/screens',
	'./frontend/src/screens/coindetail',
	'./frontend/src/screens/home',
	'./frontend/src/screens/profile',
	'./frontend/src/screens/trade',
	'./frontend/src/services',
	'./frontend/src/types',
];

const BACKEND_PROTECTED_DIRS = [
	'./backend/cmd',
	'./backend/internal',
	'./backend/internal/api',
	'./backend/internal/middleware',
	'./backend/internal/model',
	'./backend/internal/service',
	'./backend/internal/service/coin',
	'./backend/internal/service/price',
	'./backend/internal/service/solana',
	'./backend/internal/service/trade',
	'./backend/internal/service/wallet',
	'./backend/internal/wallet',
	'./backend/keys',
	'./backend/scripts'
];

type ProjectType = 'frontend' | 'backend';

interface StructureConfig {
	protectedDirs: string[];
	baseDir: string;
	excludeFlags: string[];
	buildFindCommand(): string;
}

const STRUCTURE_CONFIGS: Record<ProjectType, StructureConfig> = {
	frontend: {
		protectedDirs: FRONTEND_PROTECTED_DIRS,
		baseDir: './frontend',
		excludeFlags: FRONTEND_EXCLUDE_FLAGS,
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
		excludeFlags: BACKEND_EXCLUDE_FLAGS,
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

function folderIssueToFileIssue(issue: FolderIssue): FileIssue {
	const cleanPath = issue.path.replace(/^\.\//, '');
	const cleanOriginalPath = issue.originalPath.replace(/^\.\//, '');
	return {
		filePath: issue.path,
		line: 1,
		column: 1,
		code: 'DUPLICATE FOLDER',
		message: `Folder ${cleanPath} should be in ${cleanOriginalPath}`
	};
}

function printResults(results: ComponentCheck[], folderIssues: FolderIssue[], showSummary: boolean = false): boolean {
	const cleanComponents = results.filter(r => r.issues.length === 0);

	// Convert all issues to FileIssue format
	const allIssues: FileIssue[] = [
		...results.flatMap(r => r.issues.map(i => issueToFileIssue(i, r.path))),
		...folderIssues.map(folderIssueToFileIssue)
	];

	if (showSummary) {
		console.log(chalk.bold('\n🔍 Structure Check Results\n'));

		// Print clean components
		if (cleanComponents.length > 0) {
			console.log(chalk.green.bold(`✅ Properly Structured Components (${cleanComponents.length}):`));
			cleanComponents.forEach(c => console.log(`   ${c.name}`));
			console.log();
		}

		if (cleanComponents.length > 0) {
			console.log(chalk.green(`\n✨ All ${cleanComponents.length} items are clean!\n`));
		}
	}

	// Only print issues if they exist
	if (allIssues.length > 0) {
		console.log(formatSummary(allIssues.length, cleanComponents.length));
		console.log(formatIssueGroup(allIssues));
		console.log(chalk.yellow('\n⚠️  Structure issues found. Please fix them before proceeding.\n'));
	}

	return allIssues.length > 0; // Return true if there are issues
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
	const seenPairs = new Set<string>();

	// Get the project root by going up from frontend/scripts to dankfolio root
	const scriptDir = process.cwd();
	const projectRoot = path.resolve(scriptDir, '..');

	const fullBaseDir = path.join(projectRoot, projectType);

	if (fs.existsSync(fullBaseDir)) {
		const cmd = config.buildFindCommand();
		console.log(chalk.yellow('\nProject Type:'), projectType);
		console.log(chalk.yellow('Built find command:'), cmd);

		try {
			const output = require('child_process').execSync(cmd, {
				encoding: 'utf8',
				stdio: ['pipe', 'pipe', 'pipe'],
				cwd: projectRoot
			});

			if (!output) {
				return allFolderIssues;
			}

			const currentDirs: string[] = output.trim().split('\n').filter(Boolean);

			for (const lDir of currentDirs) {
				for (const lProtectedDir of config.protectedDirs) {
					const dir = lDir.toLowerCase()
					const protectedDir = lProtectedDir.toLowerCase();

					const fullKeyPair = [dir, protectedDir].join('->');
					const reverseKeyPair = [protectedDir, dir].join('->');
					if (dir === protectedDir) {
						continue;
					}

					const lastPartDir = dir.split('/').pop();
					const lastPartProtectedDir = protectedDir.split('/').pop();
					if (lastPartDir !== lastPartProtectedDir) {
						continue;
					}

					// If the current directory is in protected dirs, skip
					if (config.protectedDirs.includes(dir)) {
						continue;
					}

					if (dir !== protectedDir) {
						seenPairs.add(fullKeyPair);
						seenPairs.add(reverseKeyPair); // Add both directions
						allFolderIssues.push({
							path: dir,
							originalPath: protectedDir,
							type: 'duplicate'
						});
						console.log(chalk.red('Duplicate directory found:'), fullKeyPair);
					}
				}
			}

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

	// Run structure checks for frontend first, then backend
	console.log(chalk.yellow('\n=== Checking Frontend Structure ==='));
	const frontendFolderIssues = checkFolderStructure('frontend');

	console.log(chalk.yellow('\n=== Checking Backend Structure ==='));
	const backendFolderIssues = checkFolderStructure('backend');

	// Combine folder issues
	const allFolderIssues = [...frontendFolderIssues, ...backendFolderIssues];

	// Print combined results and get issues status
	const hasIssues = printResults(componentResults, allFolderIssues, true);

	// Exit with appropriate code
	process.exit(hasIssues ? 1 : 0);
} catch (error) {
	console.error(chalk.red('\n❌ Error running structure check:'), error);
	process.exit(1);
}
