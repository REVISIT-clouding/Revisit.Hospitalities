const { data, error: authError } = await supabase.auth.signInWithPassword({
  email: form.email,
  password: form.password,
});

if (authError) { setError(authError.message); setLoading(false); return; }

// Fetch slug for redirect
const { data: userData } = await supabase
  .from("users")
  .select("hospitals(slug)")
  .eq("id", data.user.id)
  .single();

router.push(`/${userData.hospitals.slug}/patients_dashboard`);