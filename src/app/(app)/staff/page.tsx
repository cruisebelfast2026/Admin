import { CoordinatorScheduleUpload } from "@/components/CoordinatorScheduleUpload";
import { PageHeader } from "@/components/PageHeader";
import { createClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/types";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const supabase = await createClient();
  let staff: Staff[] = [];
  let configured = false;

  if (supabase) {
    configured = true;
    const { data } = await supabase
      .from("staff")
      .select("*")
      .order("first_name", { ascending: true });
    staff = (data as Staff[]) ?? [];
  }

  return (
    <div>
      <PageHeader
        title="Staff Setup"
        subtitle="Master record for all personnel. Changes cascade to all rotas and assignments."
      />
      <StaffManager initialStaff={staff} configured={configured} />
      <div className="mt-5">
        <CoordinatorScheduleUpload staff={staff} />
      </div>
    </div>
  );
}
