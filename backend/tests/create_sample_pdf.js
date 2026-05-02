// Simple script to create a basic PDF for testing
const fs = require('fs');
const path = require('path');

// Create a minimal PDF structure (very basic, but valid)
const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 1200
>>
stream
BT
/F1 12 Tf
50 720 Td
(JOHN DOE) Tj
0 -20 Td
(Full Stack Developer) Tj
0 -30 Td
(Contact Information:) Tj
0 -15 Td
(Email: john.doe@email.com) Tj
0 -15 Td
(Phone: +91-9876543210) Tj
0 -30 Td
(Professional Summary:) Tj
0 -15 Td
(Experienced Full Stack Developer with 3 years of hands-on experience) Tj
0 -15 Td
(in building scalable web applications using modern technologies.) Tj
0 -30 Td
(Technical Skills:) Tj
0 -15 Td
(Frontend: React, JavaScript, TypeScript, HTML, CSS, Next.js) Tj
0 -15 Td
(Backend: Node.js, Express, MongoDB, REST APIs) Tj
0 -15 Td
(Tools: Git, Docker, npm) Tj
0 -30 Td
(Work Experience:) Tj
0 -15 Td
(Software Engineer - Tech Solutions Inc \\(2021 - Present\\)) Tj
0 -15 Td
(- Developed React-based web applications) Tj
0 -15 Td
(- Built RESTful APIs using Node.js and Express) Tj
0 -15 Td
(- Worked with MongoDB for database management) Tj
0 -30 Td
(Education:) Tj
0 -15 Td
(Bachelor of Technology in Computer Science, XYZ University, 2020) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
1569
%%EOF`;

const outputPath = path.join(__dirname, 'fixtures', 'sample_resume.pdf');
fs.writeFileSync(outputPath, pdfContent);
console.log('✅ Created sample_resume.pdf at:', outputPath);
