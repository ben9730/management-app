'use client'

/**
 * Projects Page
 *
 * Main page for managing projects.
 * Hebrew RTL support with dark mode.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { ProjectsList } from '@/components/projects/ProjectsList'
import { ProjectForm, ProjectFormData } from '@/components/forms/ProjectForm'
import type { Project } from '@/types/entities'

// Hooks
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from '@/hooks/use-projects'

// Default organization ID (will be replaced with auth later)
const DEFAULT_ORG_ID = 'org-default'

export default function ProjectsPage() {
  const router = useRouter()

  // Fetch projects
  const {
    data: projects = [],
    isLoading,
    error,
    refetch,
  } = useProjects(DEFAULT_ORG_ID)

  // Mutations
  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()
  const deleteProjectMutation = useDeleteProject()

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  // Get the ID of project being deleted
  const deletingProjectId = deleteProjectMutation.isPending
    ? (deleteProjectMutation.variables as string)
    : null

  // Map Project to form data
  const projectToFormData = (project: Project): Partial<ProjectFormData> => ({
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    start_date: project.start_date
      ? new Date(project.start_date).toISOString().split('T')[0]
      : undefined,
    end_date: project.end_date
      ? new Date(project.end_date).toISOString().split('T')[0]
      : undefined,
  })

  // Handle add project
  const handleAddProject = useCallback(() => {
    setEditingProject(null)
    setIsModalOpen(true)
  }, [])

  // Handle edit project
  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project)
    setIsModalOpen(true)
  }, [])

  // Handle delete project
  const handleDeleteProject = useCallback(
    (id: string) => {
      deleteProjectMutation.mutate(id)
    },
    [deleteProjectMutation]
  )

  // Handle select project - navigate to dashboard with project
  const handleSelectProject = useCallback(
    (project: Project) => {
      // Navigate to home with the selected project
      router.push(`/?project=${project.id}`)
    },
    [router]
  )

  // Handle form submit
  const handleFormSubmit = useCallback(
    async (data: ProjectFormData) => {
      if (editingProject) {
        // Update existing project
        await updateProjectMutation.mutateAsync({
          id: editingProject.id,
          updates: {
            name: data.name,
            description: data.description || null,
            status: data.status,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
          },
        })
      } else {
        // Create new project
        await createProjectMutation.mutateAsync({
          name: data.name,
          description: data.description || null,
          status: data.status,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
        })
      }
      setIsModalOpen(false)
      setEditingProject(null)
    },
    [editingProject, createProjectMutation, updateProjectMutation]
  )

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false)
    setEditingProject(null)
  }, [])

  // Handle retry
  const handleRetry = useCallback(() => {
    refetch()
  }, [refetch])

  const isSubmitting =
    createProjectMutation.isPending || updateProjectMutation.isPending

  return (
    <main className="min-h-screen bg-surface py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            ניהול פרויקטים
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            צפייה וניהול של כל הפרויקטים שלך
          </p>
        </div>

        {/* Projects List */}
        <ProjectsList
          projects={projects}
          onEdit={handleEditProject}
          onDelete={handleDeleteProject}
          onAdd={handleAddProject}
          onSelect={handleSelectProject}
          onRetry={handleRetry}
          isLoading={isLoading}
          error={error?.message ?? null}
          deletingProjectId={deletingProjectId}
        />

        {/* Add/Edit Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          title={editingProject ? 'עריכת פרויקט' : 'פרויקט חדש'}
        >
          <ProjectForm
            onSubmit={handleFormSubmit}
            onCancel={handleModalClose}
            isLoading={isSubmitting}
            initialValues={editingProject ? projectToFormData(editingProject) : undefined}
            mode={editingProject ? 'edit' : 'create'}
          />
        </Modal>
      </div>
    </main>
  )
}
