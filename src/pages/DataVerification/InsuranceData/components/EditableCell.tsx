import React, { useState } from 'react';
import { Select, Tag } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

const { Option } = Select;

interface EditableCellProps {
  value: string;
  record: any;
  field: string;
  onSave: (record: any, field: string, value: string) => Promise<void>;
  options: Array<{ value: string; label: string; color: string }>;
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  record,
  field,
  onSave,
  options
}) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);

  const handleSave = async () => {
    if (currentValue === value) {
      setEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onSave(record, field, currentValue);
      setEditing(false);
    } catch (error) {
      console.error('保存失败:', error);
      // 恢复原值
      setCurrentValue(value);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentValue(value);
    setEditing(false);
  };

  const getDisplayValue = () => {
    const option = options.find(opt => opt.value === value);
    if (!option) return '-';
    
    return (
      <Tag color={option.color} style={{ cursor: 'pointer' }}>
        {option.label}
      </Tag>
    );
  };

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Select
          value={currentValue}
          onChange={setCurrentValue}
          style={{ minWidth: '100px' }}
          size="small"
          loading={loading}
        >
          {options.map(option => (
            <Option key={option.value} value={option.value}>
              <Tag color={option.color}>{option.label}</Tag>
            </Option>
          ))}
        </Select>
        <CheckOutlined 
          style={{ color: '#52c41a', cursor: 'pointer' }} 
          onClick={handleSave}
        />
        <CloseOutlined 
          style={{ color: '#ff4d4f', cursor: 'pointer' }} 
          onClick={handleCancel}
        />
      </div>
    );
  }

  return (
    <div onClick={() => setEditing(true)} style={{ cursor: 'pointer' }}>
      {getDisplayValue()}
    </div>
  );
};

export default EditableCell;
