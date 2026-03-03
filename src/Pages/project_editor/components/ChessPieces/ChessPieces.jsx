import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChess } from '../../../../hooks/useChess';
import CardView from './views/CardView';
import ListView from './views/ListView';
import FilterPanel from './filters/FilterPanel';
import ViewControls from './controls/ViewControls';
import SortControls from './controls/SortControls';
import Pagination from './controls/Pagination';
import EditChessModal from './modals/EditChessModal';
import DeleteConfirmModal from './modals/DeleteConfirmModal';
import './ChessPieces.css';

const ChessPieces = ({ projectId }) => {
  const { getPiecesByProject, chessData, updateChess, deleteChess, loading, createChess } = useChess();
  const navigate = useNavigate();

  // 状态管理
  const [viewMode, setViewMode] = useState('card'); // 'card' 或 'list'
  const [showFilter, setShowFilter] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND'); // 'AND' 或 'OR'
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingPiece, setEditingPiece] = useState(null);
  const [deletingPiece, setDeletingPiece] = useState(null);

  // 加载棋子数据
  useEffect(() => {
    getPiecesByProject(projectId);
  }, [projectId, getPiecesByProject]);

  // 过滤和排序棋子
  const filteredAndSortedPieces = useMemo(() => {
    let pieces = Object.values(chessData);
    // 标签筛选
    if (selectedTags.length > 0) {
      pieces = pieces.filter(piece => {
        if (filterLogic === 'AND') {
          return selectedTags.every(tag => piece.piece_tags?.includes(tag));
        } else {
          return selectedTags.some(tag => piece.piece_tags?.includes(tag));
        }
      });
    }

    // 排序
    pieces.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return pieces;
  }, [chessData, projectId, selectedTags, filterLogic, sortBy, sortOrder]);

  // 分页处理
  const totalPages = Math.ceil(filteredAndSortedPieces.length / pageSize);
  const paginatedPieces = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredAndSortedPieces.slice(start, end);
  }, [filteredAndSortedPieces, currentPage, pageSize]);

  // 处理编辑棋子
  const handleEditPiece = (piece) => {
    setEditingPiece(piece);
  };

  // 处理保存编辑
  const handleSaveEdit = async (updatedPiece) => {
    try {
      await updateChess(updatedPiece.id, updatedPiece);
      setEditingPiece(null);
      alert('棋子更新成功！');
    } catch (error) {
      console.error('更新棋子失败:', error);
      alert('更新失败，请重试');
    }
  };

  // 处理删除棋子
  const handleDeletePiece = (piece) => {
    setDeletingPiece(piece);
  };

  // 确认删除
  const handleConfirmDelete = async () => {
    if (deletingPiece) {
      try {
        await deleteChess(deletingPiece.id);
        setDeletingPiece(null);
        alert('棋子删除成功！');
      } catch (error) {
        console.error('删除棋子失败:', error);
        alert('删除失败，请重试');
      }
    }
  };

  // 打开棋子（导航到编辑器）
  const handleOpenPiece = (piece) => {
    navigate(`/chess-editor/${piece.id}`, { state: { piece } });
  };

  return (
    <div className="chess-pieces">
      <div className="chess-pieces-header">
        <h2>棋子管理</h2>
        <div className="chess-pieces-controls">
          <button className="create-button" onClick={() => {
            createChess(projectId);
          }}>+ 创建新棋子</button>
          <ViewControls
            viewMode={viewMode}
            onViewChange={setViewMode}
          />
          <button
            className="filter-button"
            onClick={() => setShowFilter(!showFilter)}
          >
            筛选 {showFilter ? '▼' : '▶'}
          </button>
          <SortControls
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={(by, order) => {
              setSortBy(by);
              setSortOrder(order);
            }}
          />
        </div>
      </div>

      {
        showFilter && (
          <FilterPanel
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            filterLogic={filterLogic}
            onLogicChange={setFilterLogic}
          />
        )
      }

      <div className="chess-pieces-content">
        {loading ? (
          <div className="loading-indicator">加载中...</div>
        ) : paginatedPieces.length === 0 ? (
          <div className="empty-state">暂无棋子</div>
        ) : viewMode === 'card' ? (
          <CardView
            pieces={paginatedPieces}
            onEdit={handleEditPiece}
            onOpen={handleOpenPiece}
            onDelete={handleDeletePiece}
          />
        ) : (
          <ListView
            pieces={paginatedPieces}
            onEdit={handleEditPiece}
            onOpen={handleOpenPiece}
            onDelete={handleDeletePiece}
          />
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />

      {
        editingPiece && (
          <EditChessModal
            piece={editingPiece}
            onSave={handleSaveEdit}
            onCancel={() => setEditingPiece(null)}
          />
        )
      }

      {
        deletingPiece && (
          <DeleteConfirmModal
            piece={deletingPiece}
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeletingPiece(null)}
          />
        )
      }
    </div >
  );
};

export default ChessPieces;