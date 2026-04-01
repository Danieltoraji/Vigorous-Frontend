import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { useChess } from '../../hooks/useChess';
import HeaderBar from './components/HeaderBar/HeaderBar';
import ProjectDetails from './components/ProjectDetails/ProjectDetails';
import ChessPieces from './components/ChessPieces/ChessPieces';
import './ProjectEditor.css';

const ProjectEditor = () => {
  const navigate = useNavigate();
  const { getProjectById, updateProject } = useProject();
  const { getPiecesByProject } = useChess();

  const { id: projectId } = useParams();
  const [currentProject, setCurrentProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const project = await getProjectById(projectId);
      setCurrentProject(project);
      await getPiecesByProject(projectId);
    } catch (error) {
      // 静默处理错误
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProject = async (updatedData) => {
    try {
      await updateProject(projectId, updatedData);
    } catch (error) {
      alert('保存失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="project-editor-loading">
        <div className="projecteditor-loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="project-editor">
      <HeaderBar
        project={currentProject}
        onSave={() => handleSaveProject(currentProject)}
        onBack={() => navigate('/explorer-project')}
      />
      <div className="project-editor-content">
        <ProjectDetails
          project={currentProject}
          onUpdate={setCurrentProject}
          onSave={handleSaveProject}
        />
        <ChessPieces projectId={projectId} />
      </div>
    </div>
  );
};

export default ProjectEditor;