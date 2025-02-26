// Author: Russell
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function Grades () {
  // This line has been borrowed from other pages "^w^
  const supabase = await createClient();
  
  // User must be signed in to proceed
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (!user) {
    // Means user isn't signed in
    return redirect("/sign-in");
  }

  return (
    <div>
      Under construction!
    </div>
  );
}
