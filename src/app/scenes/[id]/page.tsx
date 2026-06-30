import { notFound } from "next/navigation";
import { loadSceneForEdit } from "@/lib/data-source";
import { SceneEditor } from "@/components/editor/SceneEditor";

export const dynamic = "force-dynamic";

export default async function SceneEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await loadSceneForEdit(id);

  if (!data) {
    notFound();
  }

  return (
    <SceneEditor
      scene={data.scene}
      storyTitle={data.story.title}
    />
  );
}
