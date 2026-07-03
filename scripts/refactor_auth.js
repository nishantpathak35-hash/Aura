const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.ts')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('src/app/api');

const newGetClinicId = `async function getClinicId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.app_metadata?.clinic_id || null;
}`;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace getClinicId implementation
  content = content.replace(
    /function getClinicId\(request: Request\): string \| null \{[\s\S]*?\n\}/,
    newGetClinicId
  );

  // Replace synchronous getClinicId calls with await
  content = content.replace(/const clinic_id = getClinicId\(request\);/g, 'const clinic_id = await getClinicId(request);');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Refactored getClinicId across ' + files.length + ' files.');
