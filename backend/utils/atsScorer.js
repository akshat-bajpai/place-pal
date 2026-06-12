const { GoogleGenerativeAI } = require('@google/generative-ai');
const pdfParse = require('pdf-parse');

/**
 * Fallback heuristic scorer when no API key is present.
 */
function heuristicScore(text, targetRole = 'General', academicYear = '3rd Year') {
  const lowercaseText = text.toLowerCase();
  const lowerRole = targetRole.toLowerCase();
  
  let structure_score = 10;
  if (lowercaseText.includes('education')) structure_score += 3;
  if (lowercaseText.includes('experience') || lowercaseText.includes('work history')) structure_score += 4;
  if (lowercaseText.includes('skills')) structure_score += 4;
  if (lowercaseText.includes('projects')) structure_score += 4;

  let skills_score = 10;
  // Dynamic skill checking based on target role
  let roleKeywords = [];
  if (lowerRole.includes('frontend') || lowerRole.includes('ui') || lowerRole.includes('web')) {
    roleKeywords = ['react', 'html', 'css', 'javascript', 'vue', 'angular', 'tailwind', 'typescript'];
  } else if (lowerRole.includes('backend') || lowerRole.includes('server')) {
    roleKeywords = ['node', 'python', 'java', 'sql', 'docker', 'aws', 'api', 'database', 'c++'];
  } else if (lowerRole.includes('data') || lowerRole.includes('machine learning')) {
    roleKeywords = ['python', 'sql', 'pandas', 'numpy', 'tensorflow', 'pytorch', 'machine learning', 'analytics'];
  } else {
    roleKeywords = ['python', 'java', 'sql', 'javascript', 'c++', 'management', 'communication', 'leadership'];
  }

  let matchedKeywords = 0;
  roleKeywords.forEach(skill => {
    if (lowercaseText.includes(skill)) matchedKeywords += 1;
  });
  skills_score += Math.min(matchedKeywords * 2, 10);

  let achievement_score = 10;
  const numbersRegex = /\b\d+(\.\d+)?[%kKmMbB]?\b/g;
  const numbersFound = (text.match(numbersRegex) || []).length;
  
  // Strictness based on year
  let requiredNumbers = 10;
  if (academicYear.includes('1st Year') || academicYear.includes('2nd Year')) {
    requiredNumbers = 5; // More lenient for younger students
  } else if (academicYear.includes('4th Year') || academicYear.includes('Grad')) {
    requiredNumbers = 15; // Stricter for seniors
  }

  if (numbersFound >= requiredNumbers) achievement_score += 10;
  else if (numbersFound >= requiredNumbers / 2) achievement_score += 5;

  let project_score = 10;
  let writing_score = 10;
  const weakVerbs = ['helped', 'worked on', 'assisted', 'participated in', 'was responsible for'];
  weakVerbs.forEach(verb => {
    if (lowercaseText.includes(verb)) writing_score -= 1;
  });

  let formatting_score = 10;
  if (text.length < 500) formatting_score -= 5;
  if (text.length > 5000) formatting_score -= 3;

  const overall_score = structure_score + skills_score + achievement_score + project_score + writing_score + formatting_score;

  return {
    overall_score,
    structure_score,
    skills_score,
    achievement_score,
    project_score,
    writing_score,
    formatting_score,
    parsing_flag: text.length < 200,
    strengths: ["Fast heuristic evaluation used (No API Key).", "Basic structure detected."],
    weaknesses: ["Cannot deeply analyze achievements without AI.", "Heuristic scoring is limited."],
    suggestions: ["Add a GEMINI_API_KEY to your backend .env for an intelligent, deep AI evaluation."]
  };
}

/**
 * Parses the PDF buffer and returns an ATS evaluation JSON.
 */
exports.evaluateResume = async (pdfBuffer, targetRole = 'General Role', academicYear = '3rd Year') => {
  let text = '';
  try {
    // 1. Extract text from PDF
    const pdfData = await pdfParse(pdfBuffer);
    text = pdfData.text;

    // Check for bad parse (e.g. image-only PDF)
    if (!text || text.length < 200) {
      return {
        overall_score: 0,
        structure_score: 0,
        skills_score: 0,
        achievement_score: 0,
        project_score: 0,
        writing_score: 0,
        formatting_score: 0,
        parsing_flag: true,
        strengths: [],
        weaknesses: ["The PDF appears to be an image, scanned document, or heavily formatted in a way that prevents text extraction."],
        suggestions: ["Export your resume directly from Word, Google Docs, or LaTeX to ensure it is machine-readable."]
      };
    }

    // 2. Determine scoring method
    if (!process.env.GEMINI_API_KEY) {
      console.log("No GEMINI_API_KEY found. Falling back to heuristic scoring.");
      return heuristicScore(text, targetRole, academicYear);
    }

    // 3. LLM Scoring
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert Enterprise ATS (Applicant Tracking System) Algorithm and Senior Tech Recruiter.
Evaluate the following extracted resume text with extreme realism. You are scoring this candidate for the target role of: "${targetRole}". 
The candidate's current education level is: "${academicYear}".

SCORING STRICTNESS:
You MUST scale your strictness based on the candidate's education level (${academicYear}).
- If 1st Year or 2nd Year: Be lenient on professional experience. Focus heavily on relevant coursework, personal projects, enthusiasm, and basic formatting.
- If 3rd Year: Expect solid projects, some internship or club experience, and moderate use of quantified impact metrics.
- If 4th Year, Grad, or Experienced: Be EXTREMELY STRICT. Severely penalize lack of quantified business/technical impact (%, $, scale, users), weak action verbs ("helped", "was responsible for"), and lack of complex technical implementations.

DO NOT INCLUDE ANY MARKDOWN formatting like \`\`\`json. Return ONLY raw JSON.

Scoring Criteria (Max 100):
- structure_score (max 25): Parsability. Are there clear standard sections (Education, Experience, Skills, Projects)? Is it single-column readable?
- skills_score (max 20): Keyword Density. Does the resume contain the required keywords, frameworks, and tools expected for a "${targetRole}"? Penalize if targeting a specialized role without matching keywords.
- achievement_score (max 20): Quantified Impact. Does the candidate use numbers and metrics to prove impact? (Scale strictness based on ${academicYear}).
- project_score (max 15): Quality and complexity of projects/experience relevant to ${targetRole}.
- writing_score (max 10): Action verbs, active voice, professional tone. Penalize weak passive language.
- formatting_score (max 10): Length constraints, cohesiveness, conciseness.

Ensure all sub-scores sum up exactly to overall_score. Clamp all sub-scores to their max values.
Be highly critical. A perfect 100 should be exceptionally rare.

Output Format MUST be exactly this JSON:
{
  "overall_score": 75,
  "structure_score": 20,
  "skills_score": 14,
  "achievement_score": 12,
  "project_score": 12,
  "writing_score": 9,
  "formatting_score": 8,
  "parsing_flag": false,
  "strengths": ["Strong action verbs", "Good project complexity"],
  "weaknesses": ["Lacks quantified metrics expected of a 4th year", "Missing critical backend keywords for the target role"],
  "suggestions": ["Add numbers to show scale", "Include specific tools used in the API project"]
}

Resume Text to Evaluate:
${text.substring(0, 8000)} // Truncate to avoid massive token limits just in case
`;

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break;
      } catch (err) {
        if (err.message && err.message.includes('503') && retries > 1) {
          retries--;
          console.log(`Gemini API 503 Error. Retrying... (${retries} attempts left)`);
          await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds
        } else {
          throw err;
        }
      }
    }
    
    let responseText = result.response.text();
    
    // Clean markdown if the LLM still included it
    responseText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    
    const evaluation = JSON.parse(responseText);
    
    // Force parsing_flag to false since we already passed the <200 length guard
    evaluation.parsing_flag = false;
    
    // Ensure math adds up just in case LLM hallucinations
    evaluation.overall_score = 
      (evaluation.structure_score || 0) + 
      (evaluation.skills_score || 0) + 
      (evaluation.achievement_score || 0) + 
      (evaluation.project_score || 0) + 
      (evaluation.writing_score || 0) + 
      (evaluation.formatting_score || 0);

    return evaluation;

  } catch (error) {
    console.error('Error evaluating resume:', error);
    
    // If text was successfully extracted but the API failed, use the heuristic fallback
    if (typeof text === 'string' && text.length >= 200) {
      const fallbackEvaluation = heuristicScore(text, targetRole, academicYear);
      fallbackEvaluation.weaknesses.push(`AI API Unavailable (${error.message}). A basic heuristic score was used instead.`);
      return fallbackEvaluation;
    }

    // Return a safe fallback if parsing completely failed (e.g., pdfParse threw an error)
    return {
      overall_score: 0,
      structure_score: 0,
      skills_score: 0,
      achievement_score: 0,
      project_score: 0,
      writing_score: 0,
      formatting_score: 0,
      parsing_flag: true,
      strengths: [],
      weaknesses: ["A technical error occurred while trying to parse or score this resume.", "Error details: " + error.message],
      suggestions: ["Try uploading a different PDF version."]
    };
  }
};
