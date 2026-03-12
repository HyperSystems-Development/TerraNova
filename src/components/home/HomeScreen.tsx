import { useState, useEffect } from "react";
import { useTauriIO } from "@/hooks/useTauriIO";
import { useProjectStore } from "@/stores/projectStore";
import { useRecentProjectsStore } from "@/stores/recentProjectsStore";
import { listDirectory } from "@/utils/ipc";
import mapDirEntry from "@/utils/mapDirEntry";
import { NewProjectDialog } from "@/components/dialogs/NewProjectDialog";
import { WhatsNewDialog, useWhatsNew } from "@/components/dialogs/WhatsNewDialog";
import { HomeSidebar, type SidebarTab } from "./HomeSidebar";
import { HomeTab } from "./HomeTab";
import { TemplatesTab } from "./TemplatesTab";
import { RecentTab } from "./RecentTab";

export function HomeScreen() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("home");
  const [showNewProject, setShowNewProject] = useState(false);
  const [defaultTemplate, setDefaultTemplate] = useState<string | undefined>();
  const { openAssetPack } = useTauriIO();
  const removeProject = useRecentProjectsStore((s) => s.removeProject);
  const { shouldShow: showWhatsNew, dismiss: dismissWhatsNew } = useWhatsNew();
  const [whatsNewOpen, setWhatsNewOpen] = useState(showWhatsNew);

  function handleCloseWhatsNew(suppress: boolean) {
    dismissWhatsNew(suppress);
    setWhatsNewOpen(false);
  }

  async function handleOpenRecentProject(path: string) {
    try {
      useProjectStore.getState().setProjectPath(path);
      const entries = await listDirectory(path);
      useProjectStore.getState().setDirectoryTree(entries.map(mapDirEntry));
      useRecentProjectsStore.getState().addProject(path);
    } catch {
      removeProject(path);
    }
  }

  function handleSelectTemplate(templateName: string) {
    setDefaultTemplate(templateName);
    setShowNewProject(true);
  }

  function handleNewProject() {
    setDefaultTemplate(undefined);
    setShowNewProject(true);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key === "n") {
        e.preventDefault();
        handleNewProject();
      } else if (e.key === "o") {
        e.preventDefault();
        openAssetPack();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openAssetPack]);

  return (
    <div className="flex flex-1 bg-tn-bg text-tn-text">
      <HomeSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onNewProject={handleNewProject}
        onOpenProject={openAssetPack}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {activeTab === "home" && (
          <HomeTab
            onOpenProject={handleOpenRecentProject}
            onRemoveProject={removeProject}
            onSelectTemplate={handleSelectTemplate}
            onSwitchTab={(tab) => setActiveTab(tab as SidebarTab)}
          />
        )}
        {activeTab === "templates" && (
          <TemplatesTab onSelectTemplate={handleSelectTemplate} />
        )}
        {activeTab === "recent" && (
          <RecentTab onOpenProject={handleOpenRecentProject} />
        )}
      </div>

      <NewProjectDialog
        open={showNewProject}
        onClose={() => setShowNewProject(false)}
        defaultTemplate={defaultTemplate}
      />
      <WhatsNewDialog open={whatsNewOpen} onClose={handleCloseWhatsNew} />
    </div>
  );
}
