import { NextRequest, NextResponse } from 'next/server';

// Dynamic import for pdf-parse to avoid SSR issues
async function parsePDF(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
}

// Skill categories for intelligent extraction
const SKILL_KEYWORDS: Record<string, string[]> = {
    'Programming Languages': [
        'python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'go', 'rust', 'ruby',
        'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'dart', 'lua', 'haskell',
    ],
    'Frontend': [
        'react', 'angular', 'vue', 'next.js', 'nextjs', 'svelte', 'html', 'css', 'sass',
        'tailwind', 'bootstrap', 'material ui', 'chakra', 'redux', 'webpack', 'vite',
    ],
    'Backend': [
        'node.js', 'nodejs', 'express', 'django', 'flask', 'fastapi', 'spring boot',
        'spring', 'rails', 'laravel', 'asp.net', 'graphql', 'rest api', 'grpc', 'microservices',
    ],
    'Databases': [
        'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch',
        'dynamodb', 'cassandra', 'firebase', 'supabase', 'sqlite', 'oracle', 'neo4j',
    ],
    'Cloud & DevOps': [
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'k8s', 'terraform', 'jenkins',
        'ci/cd', 'github actions', 'ansible', 'nginx', 'linux', 'serverless', 'lambda',
    ],
    'AI/ML': [
        'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
        'nlp', 'computer vision', 'neural network', 'transformers', 'bert', 'gpt',
        'data science', 'pandas', 'numpy', 'opencv', 'keras', 'hugging face',
    ],
    'Tools & Practices': [
        'git', 'github', 'gitlab', 'jira', 'agile', 'scrum', 'figma', 'postman',
        'testing', 'jest', 'selenium', 'cypress', 'unit testing', 'tdd', 'bdd',
    ],
};

// Section headers commonly found in resumes
const SECTION_PATTERNS = {
    experience: /(?:work\s*experience|professional\s*experience|employment|work\s*history|experience)/i,
    education: /(?:education|academic|qualification|degree)/i,
    skills: /(?:skills|technical\s*skills|competencies|technologies|tech\s*stack)/i,
    projects: /(?:projects|personal\s*projects|portfolio|key\s*projects)/i,
    certifications: /(?:certifications|certificates|licenses)/i,
    achievements: /(?:achievements|awards|honors|accomplishments)/i,
    summary: /(?:summary|objective|profile|about\s*me|professional\s*summary)/i,
};

interface ResumeData {
    skills: string[];
    skillCategories: Record<string, string[]>;
    experience: string[];
    projects: string[];
    education: string[];
    certifications: string[];
    achievements: string[];
    summary: string;
    yearsOfExperience: number;
    seniorityLevel: string;
    suggestedRoles: string[];
    rawText: string;
    name: string;
    email: string;
    phone: string;
}

function extractEmail(text: string): string {
    const match = text.match(/[\w.-]+@[\w.-]+\.\w{2,}/);
    return match ? match[0] : '';
}

function extractPhone(text: string): string {
    const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0] : '';
}

function extractName(text: string): string {
    // Typically the first non-empty line is the name
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 0) {
        const firstLine = lines[0];
        // Heuristic: Name is usually short, no special chars beyond spaces/hyphens
        if (firstLine.length < 60 && /^[A-Za-z\s.\-']+$/.test(firstLine)) {
            return firstLine;
        }
    }
    return '';
}

function extractSkills(text: string): { skills: string[]; categories: Record<string, string[]> } {
    const lowerText = text.toLowerCase();
    const foundSkills: string[] = [];
    const categories: Record<string, string[]> = {};

    for (const [category, keywords] of Object.entries(SKILL_KEYWORDS)) {
        categories[category] = [];
        for (const keyword of keywords) {
            // Use word boundary matching for better accuracy
            const regex = new RegExp(`\\b${keyword.replace(/[+.]/g, '\\$&')}\\b`, 'i');
            if (regex.test(lowerText)) {
                const properCase = keyword.split(' ').map(w =>
                    w === 'aws' || w === 'gcp' || w === 'api' || w === 'sql' || w === 'css' || w === 'html' || w === 'ci/cd' || w === 'nlp' || w === 'tdd' || w === 'bdd' || w === 'grpc'
                        ? w.toUpperCase()
                        : w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ');
                if (!foundSkills.includes(properCase)) {
                    foundSkills.push(properCase);
                    categories[category].push(properCase);
                }
            }
        }
    }

    // Remove empty categories
    for (const cat of Object.keys(categories)) {
        if (categories[cat].length === 0) delete categories[cat];
    }

    return { skills: foundSkills, categories };
}

function extractSections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = text.split('\n');
    let currentSection = 'header';
    let currentContent: string[] = [];

    for (const line of lines) {
        let foundSection = false;
        for (const [section, pattern] of Object.entries(SECTION_PATTERNS)) {
            if (pattern.test(line) && line.trim().length < 80) {
                // Save previous section
                if (currentContent.length > 0) {
                    sections[currentSection] = currentContent.join('\n').trim();
                }
                currentSection = section;
                currentContent = [];
                foundSection = true;
                break;
            }
        }
        if (!foundSection) {
            currentContent.push(line);
        }
    }
    // Save last section
    if (currentContent.length > 0) {
        sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
}

function extractExperience(sections: Record<string, string>): string[] {
    const expText = sections.experience || '';
    if (!expText) return [];

    // Split by common patterns (company names, dates, etc.)
    const entries = expText.split(/\n(?=[A-Z][\w\s]*(?:[-–|]|at\s|@\s))/);
    return entries.map(e => e.trim()).filter(e => e.length > 20).slice(0, 5);
}

function extractProjects(sections: Record<string, string>): string[] {
    const projText = sections.projects || '';
    if (!projText) return [];

    const entries = projText.split(/\n(?=[A-Z•●▪-])/).filter(e => e.trim().length > 15);
    return entries.map(e => e.trim()).slice(0, 5);
}

function estimateYearsOfExperience(text: string): number {
    // Look for year ranges like 2020-2024, Jan 2020 - Present, etc.
    const yearPattern = /(?:20\d{2}|19\d{2})\s*[-–to]+\s*(?:20\d{2}|19\d{2}|present|current)/gi;
    const matches = text.match(yearPattern) || [];

    let totalYears = 0;
    for (const match of matches) {
        const years = match.match(/(\d{4})/g);
        if (years && years.length >= 2) {
            totalYears += parseInt(years[1]) - parseInt(years[0]);
        } else if (match.toLowerCase().includes('present') || match.toLowerCase().includes('current')) {
            const startYear = match.match(/(\d{4})/);
            if (startYear) {
                totalYears += new Date().getFullYear() - parseInt(startYear[1]);
            }
        }
    }

    return Math.max(0, Math.min(totalYears, 30));
}

function determineSeniority(years: number, skills: string[]): string {
    if (years >= 8 || skills.length >= 15) return 'Senior';
    if (years >= 4 || skills.length >= 10) return 'Mid-Level';
    if (years >= 1 || skills.length >= 5) return 'Junior';
    return 'Entry-Level / Fresher';
}

function suggestRoles(skillCategories: Record<string, string[]>): string[] {
    const roles: { role: string; score: number }[] = [];

    const frontendCount = (skillCategories['Frontend'] || []).length;
    const backendCount = (skillCategories['Backend'] || []).length;
    const dbCount = (skillCategories['Databases'] || []).length;
    const cloudCount = (skillCategories['Cloud & DevOps'] || []).length;
    const mlCount = (skillCategories['AI/ML'] || []).length;
    const langCount = (skillCategories['Programming Languages'] || []).length;

    if (frontendCount >= 2 && backendCount >= 1) roles.push({ role: 'Full Stack Developer', score: frontendCount + backendCount + dbCount });
    if (frontendCount >= 2) roles.push({ role: 'Frontend Developer', score: frontendCount * 2 });
    if (backendCount >= 2) roles.push({ role: 'Backend Engineer', score: backendCount * 2 + dbCount });
    if (mlCount >= 2) roles.push({ role: 'Data Scientist', score: mlCount * 2 + langCount });
    if (mlCount >= 3) roles.push({ role: 'ML Engineer', score: mlCount * 3 });
    if (cloudCount >= 2) roles.push({ role: 'DevOps Engineer', score: cloudCount * 2 });
    if (langCount >= 3) roles.push({ role: 'Software Engineer', score: langCount + backendCount });

    roles.sort((a, b) => b.score - a.score);
    return roles.slice(0, 3).map(r => r.role);
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('resume') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
        }

        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 });
        }

        // Parse PDF
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const rawText = await parsePDF(buffer);

        if (!rawText || rawText.trim().length < 50) {
            return NextResponse.json({ error: 'Could not extract text from PDF. Make sure it contains selectable text (not scanned images).' }, { status: 400 });
        }

        // Extract structured data
        const sections = extractSections(rawText);
        const { skills, categories } = extractSkills(rawText);
        const experience = extractExperience(sections);
        const projects = extractProjects(sections);
        const yearsOfExperience = estimateYearsOfExperience(rawText);
        const seniorityLevel = determineSeniority(yearsOfExperience, skills);
        const suggestedRoles = suggestRoles(categories);

        const resumeData: ResumeData = {
            skills,
            skillCategories: categories,
            experience,
            projects,
            education: sections.education ? [sections.education] : [],
            certifications: sections.certifications ? [sections.certifications] : [],
            achievements: sections.achievements ? [sections.achievements] : [],
            summary: sections.summary || '',
            yearsOfExperience,
            seniorityLevel,
            suggestedRoles,
            rawText: rawText.substring(0, 5000), // Limit stored text
            name: extractName(rawText),
            email: extractEmail(rawText),
            phone: extractPhone(rawText),
        };

        return NextResponse.json({
            success: true,
            data: resumeData,
            message: `Successfully parsed resume. Found ${skills.length} skills across ${Object.keys(categories).length} categories.`,
        });

    } catch (error: any) {
        console.error('Resume parse error:', error);
        return NextResponse.json({
            error: 'Failed to parse resume. Please ensure the file is a valid PDF.',
            details: error?.message || 'Unknown error',
        }, { status: 500 });
    }
}
