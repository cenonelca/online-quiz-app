"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const masterKey = String(formData.get("masterKey") || "").trim();

  if (!fullName || !email || !password || !masterKey) {
    return { error: "Please fill in your name, email, password, and faculty signup key." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const requiredKey = process.env.TEACHER_SIGNUP_KEY;
  if (requiredKey && masterKey !== requiredKey) {
    return {
      error:
        "That faculty signup key isn't correct. Ask your department admin for the key used to create instructor accounts.",
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return {
      notice:
        "Account created. Check your email to confirm your address, then log in.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/teacher");
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/teacher");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect email or password." };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/teacher");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
