// Copy this file to `config.js` and fill in your Supabase project values.
// config.js is gitignored so your keys stay out of source control.
//
//   Supabase dashboard → Project Settings → API
//     • Project URL  → url
//     • anon public  → anonKey
//
// The anon key is safe to expose in a client app when RLS is enabled
// (see supabase/schema.sql).
window.SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY',
  bucket: 'card-files',
};
