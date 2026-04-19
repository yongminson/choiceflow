import type { DashboardFormsState } from "@/lib/types/dashboard-forms";

function fileMeta(f: File) {
  return { name: f.name, size: f.size, type: f.type };
}

/** File 객체를 JSON 직렬화 가능한 형태로 바꿉니다. */
export function serializeDashboardForms(forms: DashboardFormsState) {
  return {
    gift: {
      ...forms.gift,
      filesA: forms.gift.filesA.map(fileMeta),
      filesB: forms.gift.filesB.map(fileMeta),
    },
    appliance: {
      ...forms.appliance,
      filesA: forms.appliance.filesA.map(fileMeta),
      filesB: forms.appliance.filesB.map(fileMeta),
      spaceLayoutFiles: forms.appliance.spaceLayoutFiles.map(fileMeta),
    },
    fashion: {
      ...forms.fashion,
      filesA: forms.fashion.filesA.map(fileMeta),
      filesB: forms.fashion.filesB.map(fileMeta),
    },
    date: {
      ...forms.date,
      filesA: forms.date.filesA.map(fileMeta),
      filesB: forms.date.filesB.map(fileMeta),
    },
    asset: {
      ...forms.asset,
      filesA: forms.asset.filesA.map(fileMeta),
      filesB: forms.asset.filesB.map(fileMeta),
    },
  };
}
