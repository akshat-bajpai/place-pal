const { spawn } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

/**
 * Calls the Python ats_optimizer.py script to evaluate the resume.
 */
exports.evaluateResume = (filePath, targetRole = 'General', academicYear = '3rd Year') => {
  return new Promise((resolve, reject) => {
    try {
      // Resolve the absolute path to the python script
      const scriptPath = path.join(__dirname, 'ats_optimizer.py');
      
      // We combine targetRole and academicYear to serve as the "job description" for the python script
      const jdContent = `Target Role: ${targetRole}\nAcademic Year/Level: ${academicYear}`;

      const args = [
        scriptPath,
        '--resume', filePath,
        '--jd', jdContent,
        '--jd-text',
        '--json'
      ];

      // Spawn the python process
      const pythonProcess = spawn('python3', args);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error('Python Stderr:', data.toString());
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          console.error(`Python script exited with code ${code}`);
          // Provide a safe fallback evaluation if Python crashes
          return resolve({
            overall_score: 0,
            parsing_flag: true,
            mode: "error",
            error_message: `Python script failed with code ${code}: ${errorData}`,
            suggestions: ["A technical error occurred while trying to parse or score this resume."]
          });
        }

        try {
          // Parse the JSON output from the python script
          const parsedResult = JSON.parse(outputData.trim());
          
          // Map to match the DB schema's expected fields if necessary
          // The database uses `evaluation.overall_score`
          parsedResult.overall_score = parsedResult.final_score || 0;
          parsedResult.parsing_flag = parsedResult.docx_issues && parsedResult.docx_issues.length > 0;
          
          resolve(parsedResult);
        } catch (parseError) {
          console.error('Error parsing JSON from Python script:', parseError);
          console.error('Raw output was:', outputData);
          resolve({
            overall_score: 0,
            parsing_flag: true,
            mode: "error",
            error_message: "Failed to parse evaluation response.",
            suggestions: ["A technical error occurred while trying to read the evaluation."]
          });
        }
      });
      
    } catch (error) {
      console.error('Error evaluating resume via Python script:', error);
      resolve({
        overall_score: 0,
        parsing_flag: true,
        mode: "error",
        error_message: error.message,
        suggestions: ["Try uploading a different version."]
      });
    }
  });
};
