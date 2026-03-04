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



  useEffect(() => {

    console.log('开始获取项目', projectId, "的棋子");
    const init = async () => {
      try {
        setIsLoading(true);
        const project = await getProjectById(projectId);
        setCurrentProject(project);
        await getPiecesByProject(projectId);
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [projectId])

  const handleSaveProject = async (updatedData) => {
    try {
      await updateProject(projectId, updatedData);
      // 保存成功提示
      alert('项目保存成功！');
    } catch (error) {
      console.error('保存项目失败:', error);
      alert('保存失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className="project-editor-loading">
        <div className="loading-spinner"></div>
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