import React, { useState, useCallback, useEffect } from 'react';
import { 
  NavBar, 
  Toast, 
  Dialog, 
  Button, 
  Card, 
  List, 
  Image, 
  SpinLoading,
  Empty,
  Tag,
  Space,
  Form,
  Input,
  Selector,
  DatePicker,
  TextArea,
  Stepper,
  Checkbox,
  Divider
} from 'antd-mobile';
import { 
  CameraOutline, 
  PictureOutline, 
  DeleteOutline,
  EyeOutline,
  RedoOutline,
  CheckOutline,
  CloseOutline
} from 'antd-mobile-icons';
import { history } from '@umijs/max';
import { recognizeImage, OcrRecognitionResult } from '@/services/ocr';
import { reimbursementAPI, ReimbursementDetail, patientAPI, Patient, medicalRecordAPI, MedicalRecord } from '@/services/medicalAssistance';
import { smartCompressImage, getImageInfo, shouldCompressImage } from '@/utils/imageUtils';
import styles from './index.less';

interface BizError extends Error {
  name: 'BizError';
  message: string;
}

// 已确认的缓存信息接口
interface ConfirmedInfo {
  id: string;
  type: string;
  label: string;
  value: string;
  sourceImage: string;
  confirmedAt: string;
}

// 识别记录接口
interface RecognitionRecord {
  id: string;
  imageUrl: string;
  fileName: string;
  recognitionResult: OcrRecognitionResult;
  createdAt: string;
}

const ReimbursementPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [recognitionResult, setRecognitionResult] = useState<OcrRecognitionResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [form] = Form.useForm();
  const [patients, setPatients] = useState<Patient[]>([]);
  
  // 新增状态：多张照片识别
  const [recognitionRecords, setRecognitionRecords] = useState<RecognitionRecord[]>([]);
  const [confirmedInfos, setConfirmedInfos] = useState<ConfirmedInfo[]>([]);
  const [adoptedItems, setAdoptedItems] = useState<Set<string>>(new Set());

  // 新增状态：就诊记录相关
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState<number[]>([]);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [patientData, setPatientData] = useState<any>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // 信息类型配置
  const infoTypes = [
    { type: 'name', label: '姓名', field: 'name' as keyof OcrRecognitionResult['extracted_data'] },
    { type: 'account_name', label: '银行账户姓名', field: 'name' as keyof OcrRecognitionResult['extracted_data'] },
    { type: 'id_card', label: '身份证号', field: 'id_card' as keyof OcrRecognitionResult['extracted_data'] },
    { type: 'bank_card', label: '银行卡号', field: 'bank_card' as keyof OcrRecognitionResult['extracted_data'] },
    { type: 'address', label: '地址', field: 'address' as keyof OcrRecognitionResult['extracted_data'] },
    { type: 'bank_name', label: '银行名称', field: 'bank_name' as keyof OcrRecognitionResult['extracted_data'] },
  ];

  // 步骤配置
  const steps = [
    { title: 'OCR识别', description: '上传发票进行识别' },
    { title: '信息确认', description: '确认识别结果' },
    { title: '报销申报', description: '填写报销信息' },
    { title: '就诊记录', description: '选择就诊记录' },
    { title: '提交完成', description: '受理提交成功' }
  ];

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      await fetchPatients();
      loadConfirmedInfos();
    };
    initializeData();
  }, []);

  // 自动填充已确认信息到表单
  useEffect(() => {
    if (currentStep === 2 && confirmedInfos.length > 0) {
      // 银行名称现在完全依靠OCR识别或手动输入，不需要检查预定义列表
    }
  }, [currentStep, confirmedInfos]);

  // 监听步骤变化，自动填充表单
  useEffect(() => {
    console.log('useEffect 触发，currentStep:', currentStep, 'confirmedInfos:', confirmedInfos);
    if (currentStep === 2 && confirmedInfos.length > 0) {
      // 进入报销申报步骤时，自动填充已确认的数据
      console.log('进入步骤2，准备填充表单');
      // 添加一个小延迟，确保状态更新完成
      setTimeout(() => {
        fillFormWithConfirmedData();
      }, 100);
    }
  }, [currentStep, confirmedInfos]);

  // 用已确认的数据填充表单
  const fillFormWithConfirmedData = () => {
    console.log('fillFormWithConfirmedData 被调用，confirmedInfos:', confirmedInfos);
    
    if (!confirmedInfos || confirmedInfos.length === 0) {
      console.log('没有已确认的信息需要填充');
      return;
    }
    
    const formData: Record<string, any> = {};
    
    // 信息类型到表单字段的映射
    const fieldMapping: Record<string, string> = {
      'name': 'patient_name',
      'id_card': 'id_card',
      'bank_card': 'bank_account',
      'address': 'address',
      'bank_name': 'bank_name',
      'account_name': 'account_name',
    };

    // 遍历已确认的信息，填充到对应的表单字段
    confirmedInfos.forEach(info => {
      const formField = fieldMapping[info.type];
      if (formField) {
        formData[formField] = info.value;
        console.log(`填充字段 ${formField} = ${info.value}`);
      }
    });

    // 设置账户姓名（默认使用患者姓名，需要在填充完其他字段后执行）
    if (formData.patient_name && !formData.account_name) {
      formData.account_name = formData.patient_name;
      console.log(`设置银行账户姓名 = ${formData.patient_name}`);
    }

    console.log('最终的表单数据:', formData);

    // 设置表单值
    if (Object.keys(formData).length > 0) {
      form.setFieldsValue(formData);
      Toast.show({
        icon: 'success',
        content: `已自动填充 ${Object.keys(formData).length} 项已确认的信息`,
      });
    } else {
      console.log('没有数据需要填充');
    }
  };

  // 从本地存储加载已确认的信息
  const loadConfirmedInfos = () => {
    try {
      const stored = localStorage.getItem('reimbursement_confirmed_infos');
      console.log('从localStorage加载数据:', stored);
      if (stored) {
        const infos = JSON.parse(stored) as ConfirmedInfo[];
        console.log('解析后的已确认信息:', infos);
        setConfirmedInfos(infos);
      } else {
        console.log('localStorage中没有找到已确认信息');
      }
    } catch (error) {
      console.error('加载已确认信息失败:', error);
    }
  };

  // 保存已确认信息到本地存储
  const saveConfirmedInfos = (infos: ConfirmedInfo[]) => {
    try {
      localStorage.setItem('reimbursement_confirmed_infos', JSON.stringify(infos));
    } catch (error) {
      console.error('保存已确认信息失败:', error);
      Toast.show({
        icon: 'fail',
        content: '保存失败，存储空间可能不足',
      });
    }
  };


  // 获取患者列表
  const fetchPatients = async () => {
    try {
      const response = await patientAPI.getPatients({ page_size: 100 });
      if (response.code === 0) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('获取患者列表失败:', error);
    }
  };

  // 处理图片上传
  const handleImageUpload = useCallback(async (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      Toast.show({
        icon: 'fail',
        content: '只能上传图片文件！',
      });
      return;
    }

    const isLt20M = file.size / 1024 / 1024 < 20;
    if (!isLt20M) {
      Toast.show({
        icon: 'fail',
        content: '图片大小不能超过20MB！',
      });
      return;
    }

    try {
      // 显示压缩提示
      Toast.show({
        icon: 'loading',
        content: '正在优化图片...',
        duration: 0
      });

      // 检查是否需要压缩
      const needCompress = await shouldCompressImage(file);
      let processedFile = file;

      if (needCompress) {
        // 获取原始图片信息
        const originalInfo = await getImageInfo(file);
        console.log('原始图片信息:', originalInfo);

        // 智能压缩图片
        processedFile = await smartCompressImage(file);
        
        // 获取压缩后图片信息
        const compressedInfo = await getImageInfo(processedFile);
        console.log('压缩后图片信息:', compressedInfo);

        // 显示压缩结果
        const sizeReduction = ((originalInfo.size - compressedInfo.size) / originalInfo.size * 100).toFixed(1);
        Toast.show({
          icon: 'success',
          content: `图片已优化，大小减少 ${sizeReduction}%`,
        });
      } else {
        Toast.show({
          icon: 'success',
          content: '图片无需优化',
        });
      }

      // 开始识别
      await handleRecognition(processedFile);
    } catch (error) {
      console.error('图片处理失败:', error);
      Toast.show({
        icon: 'fail',
        content: '图片处理失败，请重试',
      });
    }
  }, []);

  // 处理拍照
  const handleCapture = useCallback(async (image: string) => {
    setUploadedImage(image);
    
    try {
      // 将 base64 转换为 File 对象
      const response = await fetch(image);
      const blob = await response.blob();
      const file = new File([blob], 'captured.jpg', { type: 'image/jpeg' });
      
      // 显示压缩提示
      Toast.show({
        icon: 'loading',
        content: '正在优化图片...',
        duration: 0
      });

      // 检查是否需要压缩
      const needCompress = await shouldCompressImage(file);
      let processedFile = file;

      if (needCompress) {
        // 获取原始图片信息
        const originalInfo = await getImageInfo(file);
        console.log('原始拍照图片信息:', originalInfo);

        // 智能压缩图片
        processedFile = await smartCompressImage(file);
        
        // 获取压缩后图片信息
        const compressedInfo = await getImageInfo(processedFile);
        console.log('压缩后拍照图片信息:', compressedInfo);

        // 显示压缩结果
        const sizeReduction = ((originalInfo.size - compressedInfo.size) / originalInfo.size * 100).toFixed(1);
        Toast.show({
          icon: 'success',
          content: `拍照图片已优化，大小减少 ${sizeReduction}%`,
        });
      } else {
        Toast.show({
          icon: 'success',
          content: '拍照图片无需优化',
        });
      }
      
      await handleRecognition(processedFile);
    } catch (error) {
      console.error('拍照图片处理失败:', error);
      Toast.show({
        icon: 'fail',
        content: '拍照图片处理失败，请重试',
      });
    }
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // 支持多文件选择
      Array.from(files).forEach(file => {
        handleImageUpload(file);
      });
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  }, [handleImageUpload]);

  // 处理拍照
  const handleCameraCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // 清空input值，允许重复选择同一文件
    event.target.value = '';
  }, [handleImageUpload]);

  // 执行识别
  const handleRecognition = async (file: File) => {
    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('image', file);

      const response = await recognizeImage(formData);
      
      if (response.code === 0) {
        // 创建图片URL
        const imageUrl = URL.createObjectURL(file);
        
        // 创建新的识别记录
        const newRecord: RecognitionRecord = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          imageUrl,
          fileName: file.name,
          recognitionResult: response.data,
          createdAt: new Date().toISOString(),
        };

        // 添加到记录列表
        const updatedRecords = [...recognitionRecords, newRecord];
        setRecognitionRecords(updatedRecords);

        // 设置当前识别结果
        setRecognitionResult(response.data);
        setUploadedImage(imageUrl);

        Toast.show({
          icon: 'success',
          content: '识别成功！',
        });

        // 跳转到信息确认步骤
        setCurrentStep(1);
      } else {
        Toast.show({
          icon: 'fail',
          content: response.msg || '识别失败',
        });
      }
    } catch (error) {
      console.error('OCR识别失败:', error);
      Toast.show({
        icon: 'fail',
        content: '识别失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 采用信息项
  const handleAdopt = (infoType: string, label: string, value: string) => {
    if (!recognitionResult || !uploadedImage) return;

    // 检查是否已有同类型信息被确认
    const existingIndex = confirmedInfos.findIndex(info => info.type === infoType);
    
    let updatedInfos: ConfirmedInfo[];
    if (existingIndex >= 0) {
      // 替换已存在的同类型信息
      updatedInfos = [...confirmedInfos];
      updatedInfos[existingIndex] = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: infoType,
        label,
        value,
        sourceImage: uploadedImage,
        confirmedAt: new Date().toISOString(),
      };
    } else {
      // 添加新信息
      const newInfo: ConfirmedInfo = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type: infoType,
        label,
        value,
        sourceImage: uploadedImage,
        confirmedAt: new Date().toISOString(),
      };
      updatedInfos = [...confirmedInfos, newInfo];
    }

    setConfirmedInfos(updatedInfos);
    saveConfirmedInfos(updatedInfos);
    
    // 标记为已采用
    setAdoptedItems(prev => new Set([...prev, infoType]));

    Toast.show({
      icon: 'success',
      content: `${label}已采用`,
    });
  };

  // 取消采用
  const handleCancelAdopt = (infoType: string) => {
    const updatedInfos = confirmedInfos.filter(info => info.type !== infoType);
    setConfirmedInfos(updatedInfos);
    saveConfirmedInfos(updatedInfos);
    
    // 从已采用列表中移除
    setAdoptedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(infoType);
      return newSet;
    });

    Toast.show({
      icon: 'success',
      content: '已取消采用',
    });
  };

  // 继续识别
  const handleContinueRecognition = () => {
    // 清空当前识别结果，返回到识别步骤
    setRecognitionResult(null);
    setUploadedImage(null);
    setAdoptedItems(new Set());
    setCurrentStep(0);
  };

  // 自动填充表单
  const autoFillForm = (result: OcrRecognitionResult) => {
    if (result.extracted_data) {
      const data = result.extracted_data;
      form.setFieldsValue({
        patient_name: data.name || '',
        id_card: data.id_card || '',
        bank_name: data.bank_name || '',
        bank_account: data.bank_card || '',
        account_name: data.account_name || data.name || '', // 账户姓名默认使用患者姓名
        address: data.address || ''
      });
    }
  };

  // 重新识别
  const handleRetry = () => {
    setShowResult(false);
    setRecognitionResult(null);
    setCurrentStep(0);
    setApplicationId(null);
  };

  // 确认使用结果
  const handleConfirm = async () => {
    if (!recognitionResult) return;
    
    try {
      await Dialog.confirm({
        content: '是否确认使用识别结果？',
        confirmText: '确认',
        cancelText: '取消',
      });
      
      setCurrentStep(2);
      
    } catch (error) {
      // 用户取消
    }
  };

  // 查询就诊记录
  const fetchMedicalRecords = async (idCard: string) => {
    if (!idCard) {
      // 如果没有身份证号，清空就诊记录，让用户手动选择
      setMedicalRecords([]);
      setPatientId(null);
      setPatientData(null);
      setSelectedRecordIds([]);
      return;
    }

    setRecordsLoading(true);
    try {
      const response = await medicalRecordAPI.getMedicalRecordsByIdCard(idCard);
      if (response.code === 0) {
        setMedicalRecords(response.data.records);
        setPatientId(response.data.patient.id);
        setPatientData(response.data.patient);
        setSelectedRecordIds([]);
        Toast.show({
          icon: 'success',
          content: `查询到 ${response.data.records.length} 条就诊记录`,
        });
      } else {
        Toast.show({
          icon: 'fail',
          content: response.message || '查询失败',
        });
      }
    } catch (error) {
      console.error('查询就诊记录失败:', error);
      Toast.show({
        icon: 'fail',
        content: '查询失败，请稍后重试',
      });
    } finally {
      setRecordsLoading(false);
    }
  };

  // 选择就诊记录
  const handleRecordSelection = (recordId: number, checked: boolean) => {
    // 找到对应的记录
    const record = medicalRecords.find(r => r.id === recordId);
    // 如果记录状态是已报销，则不允许选择
    if (record && record.processing_status === 'reimbursed') {
      return;
    }
    
    if (checked) {
      setSelectedRecordIds(prev => [...prev, recordId]);
    } else {
      setSelectedRecordIds(prev => prev.filter(id => id !== recordId));
    }
  };

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // 只选择状态不是已报销的记录
      const selectableRecords = medicalRecords.filter(record => record.processing_status !== 'reimbursed');
      setSelectedRecordIds(selectableRecords.map(record => record.id));
    } else {
      setSelectedRecordIds([]);
    }
  };

  // 删除图片
  const handleDelete = () => {
    setUploadedImage(null);
    setRecognitionResult(null);
    setShowResult(false);
    setCurrentStep(0);
    setApplicationId(null);
  };

  // 提交报销申请
  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      
      // 自动查询就诊记录（身份证号为可选）
      const idCard = values.id_card;
      if (idCard) {
        await fetchMedicalRecords(idCard);
        setCurrentStep(3); // 跳转到就诊记录选择步骤
      } else {
        // 如果没有身份证号，直接跳转到就诊记录选择步骤
        // 用户需要手动选择患者
        setCurrentStep(3);
      }
      
    } catch (error) {
      console.error('提交失败:', error);
      Toast.show({
        icon: 'fail',
        content: '提交失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 提交报销申请 (就诊记录选择步骤)
  const handleSubmitReimbursement = async () => {
    if (selectedRecordIds.length === 0) {
      Toast.show({
        icon: 'fail',
        content: '请选择至少一条就诊记录',
      });
      return;
    }

    try {
      setLoading(true);
      
      // 验证表单数据
      const formValues = form.getFieldsValue();
      console.log('提交时的表单值:', formValues);
      console.log('当前的confirmedInfos:', confirmedInfos);
      
      // 检查银行信息是否完整（患者信息为可选）
      if (! confirmedInfos.some(info => info.type === 'bank_name') || !confirmedInfos.some(info => info.type === 'name')  || !confirmedInfos.some(info => info.type === 'bank_card') ) {
        console.log('银行信息不完整:', {
          bank_name: confirmedInfos.find(info => info.type === 'bank_name')?.value,
          bank_account: confirmedInfos.find(info => info.type === 'bank_card')?.value,
          account_name: confirmedInfos.find(info => info.type === 'name')?.value  
        });
        Toast.show({
          icon: 'fail',
          content: '请完善银行信息：银行名称、银行账号、账户姓名',
        });
        return;
      }
      
      // 准备提交数据
      const submitData = {
        person_id: patientId!,
        medical_record_ids: selectedRecordIds,
        bank_name: confirmedInfos.find(info => info.type === 'bank_name')?.value || '',
        bank_account: confirmedInfos.find(info => info.type === 'bank_card')?.value || '',
        account_name: confirmedInfos.find(info => info.type === 'account_name')?.value || '',
        reimbursement_status: 'pending',
      };
      
      console.log('提交报销申请数据:', submitData);
      
      // 调用批量创建报销明细接口
      const response = await reimbursementAPI.batchCreateReimbursements(submitData);

      if (response.code === 0) {
        // 保存申请ID（取第一个报销明细的ID）
        if (response.data && response.data.id) {
          setApplicationId(response.data.id.toString());
        }
        Toast.show({
          icon: 'success',
          content: '报销申请提交成功！',
        });
        setCurrentStep(4); // 跳转到成功步骤
      } else {
        Toast.show({
          icon: 'fail',
          content: response.message || '提交失败',
        });
      }
    } catch (error) {
      console.error('提交报销申请失败:', error);
      Toast.show({
        icon: 'fail',
        content: '提交失败，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  // 返回上一页
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      history.back();
    }
  };

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderOcrStep();
      case 1:
        return renderConfirmStep();
      case 2:
        return renderFormStep();
      case 3:
        return renderMedicalRecordsStep();
      case 4:
        return renderSuccessStep();
      default:
        return null;
    }
  };

  // 渲染OCR识别步骤
  const renderOcrStep = () => (
    <>
      {/* 上传区域 */}
      <Card className={styles.uploadCard}>
        <div className={styles.uploadArea}>
          <div className={styles.uploadButtons}>
            <Button
              block
              color="primary"
              size="large"
              onClick={() => {
                const cameraInput = document.getElementById('camera-input') as HTMLInputElement;
                if (cameraInput) {
                  cameraInput.click();
                }
              }}
            >
              <CameraOutline /> 拍照识别
            </Button>
            
            <Button
              block
              size="large"
              onClick={() => {
                const fileInput = document.getElementById('file-input') as HTMLInputElement;
                if (fileInput) {
                  fileInput.click();
                }
              }}
            >
              <PictureOutline /> 选择图片
            </Button>
            
            <Button
              block
              size="large"
              color="default"
              onClick={() => {
                setCurrentStep(2);
              }}
            >
              <CheckOutline /> 手动录入
            </Button>
          </div>
          
          <div className={styles.uploadTips}>
            <p>支持多张图片批量识别</p>
            <p>支持 JPG、PNG、GIF 格式</p>
            <p>文件大小不超过 10MB</p>
            <p>自动优化图片大小和分辨率</p>
            <p>识别结果将保存在本地</p>
            <p>也可以选择手动录入信息</p>
          </div>
        </div>
      </Card>

      {/* 识别中状态 */}
      {loading && (
        <Card className={styles.loadingCard}>
          <div className={styles.loadingContent}>
            <SpinLoading color="primary" />
            <p>正在识别中...</p>
            <p>请稍候</p>
          </div>
        </Card>
      )}

      {/* 识别记录列表 */}
      {recognitionRecords.length > 0 && (
        <Card className={styles.recordsCard}>
          <div className={styles.recordsHeader}>
            <h3>识别记录 ({recognitionRecords.length})</h3>
          </div>
          
          <List className={styles.recordsList}>
            {recognitionRecords.map((record) => (
              <List.Item
                key={record.id}
                prefix={
                  <Image
                    src={record.imageUrl}
                    width={60}
                    height={60}
                    fit="cover"
                    style={{ borderRadius: 8 }}
                  />
                }
                                   extra={
                     <Space direction="vertical">
                       <Tag color="success">已识别</Tag>
                       <Button
                         size="small"
                         onClick={() => {
                           setRecognitionResult(record.recognitionResult);
                           setUploadedImage(record.imageUrl);
                           setCurrentStep(1);
                         }}
                       >
                         <EyeOutline /> 查看结果
                       </Button>
                     </Space>
                   }
              >
                <div className={styles.recordInfo}>
                  <div className={styles.recordTitle}>{record.fileName}</div>
                  <div className={styles.recordTime}>
                    {new Date(record.createdAt).toLocaleString()}
                  </div>
                  <div className={styles.recordConfidence}>
                    置信度: {(record.recognitionResult.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </List.Item>
            ))}
          </List>
        </Card>
      )}

      {/* 隐藏的文件输入元素 */}
      <input
        id="file-input"
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraCapture}
      />
    </>
  );

  // 渲染信息确认步骤
  const renderConfirmStep = () => {
    if (!recognitionResult) {
      return (
        <>
        <Card className={styles.emptyCard}>
          <Empty description="暂无识别结果" />
        </Card>
        <Button
            block
            size="large"
            onClick={() => setCurrentStep(0)}
          >
            返回上一步
          </Button>
        </>
      );
    }

    return (
      <>
        {/* 当前识别结果 */}
        <Card className={styles.recognitionCard}>
          <div className={styles.recognitionHeader}>
            <h3>本次识别结果</h3>
            <Tag color="primary">新识别</Tag>
          </div>
          
          {uploadedImage && (
            <div className={styles.imagePreview}>
              <Image
                src={uploadedImage}
                width="100%"
                height={120}
                fit="cover"
                style={{ borderRadius: 8 }}
              />
              <div className={styles.imageInfo}>
                <span>识别图片</span>
                <span>置信度: {(recognitionResult.confidence * 100).toFixed(1)}%</span>
              </div>
            </div>
          )}
          
          <List className={styles.recognitionList}>
            {infoTypes.map((infoType) => {
              const value = recognitionResult.extracted_data[infoType.field];
              const isAdopted = adoptedItems.has(infoType.type);
              
              if (!value) return null;
              
              return (
                <List.Item
                  key={infoType.type}
                  extra={
                    <Space direction="vertical" align="end" style={{ minWidth: 0, flex: 1 }}>
                      <span className={styles.valueText} style={{ 
                        wordBreak: 'break-all',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'right',
                        maxWidth: '200px'
                      }}>
                        {value}
                      </span>
                      {isAdopted ? (
                        <Button
                          size="small"
                          color="success"
                          onClick={() => handleCancelAdopt(infoType.type)}
                        >
                          <CheckOutline /> 已采用
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleAdopt(infoType.type, infoType.label, value)}
                        >
                          采用
                        </Button>
                      )}
                    </Space>
                  }
                >
                  {infoType.label}
                </List.Item>
              );
            })}
          </List>
        </Card>

        {/* 已确认信息 */}
        {confirmedInfos.length > 0 && (
          <Card className={styles.confirmedCard}>
            <div className={styles.confirmedHeader}>
              <h3>已确认信息</h3>
              <Tag color="success">{confirmedInfos.length} 项</Tag>
            </div>
            
            <List className={styles.confirmedList}>
              {confirmedInfos.map((info) => (
                <List.Item
                  key={info.id}
                  prefix={
                    <Image
                      src={info.sourceImage}
                      width={40}
                      height={40}
                      fit="cover"
                      style={{ borderRadius: 4 }}
                    />
                  }
                                     extra={
                     <Space direction="vertical" align="end" style={{ minWidth: 0, flex: 1 }}>
                       <span className={styles.valueText} style={{ 
                         wordBreak: 'break-all',
                         wordWrap: 'break-word',
                         whiteSpace: 'pre-wrap',
                         textAlign: 'right',
                         maxWidth: '200px'
                       }}>
                         {info.value}
                       </span>
                       <span className={styles.confirmedTime}>
                         {new Date(info.confirmedAt).toLocaleString()}
                       </span>
                     </Space>
                   }
                >
                  <div className={styles.confirmedInfo}>
                    <div className={styles.confirmedLabel}>{info.label}</div>
                    <div className={styles.confirmedStatus}>
                      <Tag color="success">已确认</Tag>
                    </div>
                  </div>
                </List.Item>
              ))}
            </List>
          </Card>
        )}

        {/* 底部按钮 */}
        <div className={styles.footer}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              block
              color="primary"
              size="large"
              onClick={handleContinueRecognition}
            >
              <CameraOutline /> 继续识别
            </Button>
            <Button
              block
              size="large"
              onClick={() => setCurrentStep(2)}
            >
              下一步
            </Button>
          </Space>
         
        </div>
        
      </>
    );
  };

  // 渲染表单步骤
  const renderFormStep = () => (
    <>
      <Card className={styles.formCard}>
        <div className={styles.formHeader}>
          <h3>填写报销信息</h3>
          <p>请完善以下报销申请信息</p>
          {confirmedInfos.length > 0 && (
            <div style={{ 
              backgroundColor: '#f6ffed', 
              border: '1px solid #b7eb8f', 
              borderRadius: '8px', 
              padding: '12px', 
              marginTop: '8px' 
            }}>
              <p style={{ color: '#52c41a', fontSize: '14px', margin: 0 }}>
                💡 已自动填充 {confirmedInfos.length} 项已确认的信息：
              </p>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                {confirmedInfos.map(info => (
                  <span key={info.id} style={{ 
                    display: 'inline-block', 
                    marginRight: '12px', 
                    marginBottom: '4px',
                    backgroundColor: '#e6f7ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #91d5ff'
                  }}>
                    {info.label}
                  </span>
                ))}
              </div>
              <div style={{ marginTop: '12px' }}>
                <Button
                  size="small"
                  color="primary"
                  onClick={fillFormWithConfirmedData}
                >
                  🔄 重新填充表单
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className={styles.reimbursementForm}
        >
          <Form.Item
            label="患者姓名"
            name="patient_name"
          >
            <Input 
              placeholder="请输入患者姓名" 
              style={{
                backgroundColor: confirmedInfos.some(info => info.type === 'name') ? '#f6ffed' : undefined,
                borderColor: confirmedInfos.some(info => info.type === 'name') ? '#b7eb8f' : undefined
              }}
            />
          </Form.Item>
          
          <Form.Item
            label="身份证号"
            name="id_card"
          >
            <Input 
              placeholder="请输入身份证号" 
              style={{
                backgroundColor: confirmedInfos.some(info => info.type === 'id_card') ? '#f6ffed' : undefined,
                borderColor: confirmedInfos.some(info => info.type === 'name') ? '#b7eb8f' : undefined
              }}
            />
          </Form.Item>
          

          
          <Form.Item
            label="地址"
            name="address"
          >
            <Input 
              placeholder="请输入地址" 
              style={{
                backgroundColor: confirmedInfos.some(info => info.type === 'address') ? '#f6ffed' : undefined,
                borderColor: confirmedInfos.some(info => info.type === 'address') ? '#b7eb8f' : undefined
              }}
            />
          </Form.Item>
          
          <Form.Item
            label="银行名称"
            name="bank_name"
            rules={[{ required: true, message: '请输入银行名称' }]}
          >
            <Input 
              placeholder="请输入银行名称" 
              style={{
                backgroundColor: confirmedInfos.some(info => info.type === 'bank_name') ? '#f6ffed' : undefined,
                borderColor: confirmedInfos.some(info => info.type === 'bank_name') ? '#b7eb8f' : undefined
              }}
            />
          </Form.Item>
          
          <Form.Item
            label="银行账号"
            name="bank_account"
            rules={[{ required: true, message: '请输入银行账号' }]}
          >
            <Input 
              placeholder="请输入银行账号" 
              style={{
                backgroundColor: confirmedInfos.some(info => info.type === 'bank_card') ? '#f6ffed' : undefined,
                borderColor: confirmedInfos.some(info => info.type === 'bank_card') ? '#b7eb8f' : undefined
              }}
            />
          </Form.Item>
          
          <Form.Item
            label="银行账户姓名"
            name="account_name"
            rules={[{ required: true, message: '请输入银行账户姓名' }]}
          >
            <Input 
              placeholder="请输入银行账户姓名" 
              style={{
                backgroundColor: confirmedInfos.some(info => info.type === 'account_name') ? '#f6ffed' : undefined,
                borderColor: confirmedInfos.some(info => info.type === 'account_name') ? '#b7eb8f' : undefined
              }}
            />
          </Form.Item>
          
                    <Form.Item
            label="备注说明"
            name="remark"
          >
            <TextArea placeholder="请输入备注说明" rows={3} />
          </Form.Item>
          
          <Form.Item>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                color="primary"
                size="large"
                type="submit"
                loading={loading}
              >
                下一步
              </Button>
              <Button
                block
                size="large"
                onClick={() => setCurrentStep(1)}
              >
                返回上一步
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </>
  );

  // 渲染就诊记录选择步骤
  const renderMedicalRecordsStep = () => (
    <>
      {/* 已确认信息预览 */}
      {confirmedInfos.length > 0 && (
        <Card className={styles.confirmedPreviewCard}>
          <div className={styles.confirmedPreviewHeader}>
            <h3>已确认信息预览</h3>
            <Tag color="success">{confirmedInfos.length} 项</Tag>
          </div>
          
          <List className={styles.confirmedPreviewList}>
            {confirmedInfos.map((info) => (
              <List.Item
                key={info.id}
                extra={
                  <Space direction="vertical" align="end" style={{ minWidth: 0, flex: 1 }}>
                    <span className={styles.valueText} style={{ 
                      wordBreak: 'break-all',
                      wordWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      textAlign: 'right',
                      maxWidth: '200px'
                    }}>
                      {info.value}
                    </span>
                    <span className={styles.confirmedTime}>
                      {new Date(info.confirmedAt).toLocaleString()}
                    </span>
                  </Space>
                }
              >
                <div className={styles.confirmedInfo}>
                  <div className={styles.confirmedLabel}>{info.label}</div>
                  <div className={styles.confirmedStatus}>
                    <Tag color="success">已确认</Tag>
                  </div>
                </div>
              </List.Item>
            ))}
          </List>
        </Card>
      )}

      <Card className={styles.medicalRecordsCard}>
        <div className={styles.medicalRecordsHeader}>
          <h3>选择就诊记录</h3>
          <p>请选择需要报销的就诊记录</p>
          <div style={{ 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f', 
            borderRadius: '8px', 
            padding: '12px', 
            marginTop: '8px' 
          }}>
            <p style={{ color: '#52c41a', fontSize: '14px', margin: 0 }}>
              💡 已根据身份证号查询到 {medicalRecords.length} 条就诊记录：
            </p>
          </div>
        </div>

        {recordsLoading && (
          <Card className={styles.loadingCard}>
            <div className={styles.loadingContent}>
              <SpinLoading color="primary" />
              <p>正在查询就诊记录...</p>
              <p>请稍候</p>
            </div>
          </Card>
        )}

        {medicalRecords.length > 0 && (
          <>
            <List className={styles.medicalRecordsList}>
              <List.Item
                onClick={() => {
                  const selectableRecords = medicalRecords.filter(record => record.processing_status !== 'reimbursed');
                  handleSelectAll(selectedRecordIds.length === selectableRecords.length);
                }}
                extra={
                  <Checkbox
                    checked={(() => {
                      const selectableRecords = medicalRecords.filter(record => record.processing_status !== 'reimbursed');
                      return selectedRecordIds.length === selectableRecords.length && selectableRecords.length > 0;
                    })()}
                    onChange={(checked) => handleSelectAll(checked)}
                  />
                }
              >
                <div style={{ fontWeight: 'bold' }}>全选</div>
              </List.Item>
              {medicalRecords.map(record => (
                <List.Item
                  key={record.id}
                  prefix={
                    <Checkbox
                      checked={selectedRecordIds.includes(record.id)}
                      disabled={record.processing_status === 'reimbursed'}
                      onChange={(checked) => handleRecordSelection(record.id, checked)}
                    />
                  }
                  extra={
                    <Space direction="vertical" align="end" style={{ minWidth: 0, flex: 1 }}>
                      <span className={styles.valueText} style={{ 
                        wordBreak: 'break-all',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        textAlign: 'right',
                        maxWidth: '200px'
                      }}>
                        ¥{typeof record.total_cost !== null ? record.total_cost : '0.00'}
                      </span>
                      <span className={styles.medicalRecordTime}>
                        {new Date(record.admission_date).toLocaleDateString()}
                      </span>
                    </Space>
                  }
                >
                  <div className={styles.medicalRecordInfo}>
                    <div className={styles.medicalRecordHospital}>{record.hospital_name}</div>
                    <div className={styles.medicalRecordType}>{record.visit_type}</div>
                    <div className={styles.medicalRecordStatus}>
                      <Tag color={record.processing_status === 'unreimbursed' ? 'success' : record.processing_status === 'reimbursed' ? 'processing' : 'warning'}>
                        {record.processing_status === 'unreimbursed' ? '未报销' : 
                         record.processing_status === 'reimbursed' ? '已报销' : 
                         record.processing_status === 'returned' ? '已退回' : 
                         record.processing_status}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              ))}
            </List>

            <div className={styles.footer}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  block
                  color="primary"
                  size="large"
                  disabled={selectedRecordIds.length === 0}
                  onClick={handleSubmitReimbursement}
                >
                  提交报销申请 ({selectedRecordIds.length} 条)
                </Button>
                <Button
                  block
                  size="large"
                  onClick={() => setCurrentStep(2)}
                >
                  返回上一步
                </Button>
              </Space>
            </div>
          </>
        )}

        {medicalRecords.length === 0 && !recordsLoading && (
          <Card className={styles.emptyCard}>
            <Empty description="未查询到就诊记录" />
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                {patientId ? '该患者暂无就诊记录' : ''}
              </p>
              <Button
                size="large"
                onClick={() => setCurrentStep(2)}
              >
                返回上一步
              </Button>
            </div>
          </Card>
        )}
      </Card>
    </>
  );

  // 渲染成功步骤
  const renderSuccessStep = () => (
    <Card className={styles.successCard}>
      <div className={styles.successContent}>
        <CheckOutline style={{ fontSize: 64, color: '#52c41a' }} />
        <h3>报销申请提交成功！</h3>
        <p>您的报销申请已成功提交</p>
        <p>申请编号：{applicationId || Date.now().toString().slice(-8)}</p>
        <p>已选择就诊记录：{selectedRecordIds.length} 条</p>
      </div>
      
      <div className={styles.successActions}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            block
            color="primary"
            size="large"
            onClick={() => {
              setCurrentStep(0);
              setUploadedImage(null);
              setRecognitionResult(null);
              setShowResult(false);
              setMedicalRecords([]);
              setSelectedRecordIds([]);
              setPatientId(null);
              setPatientData(null);
              setApplicationId(null);
              form.resetFields();
            }}
          >
            继续受理
          </Button>
          <Button
            block
            size="large"
            onClick={() => history.push('/m/medical/reimbursement')}
          >
            返回首页
          </Button>
        </Space>
      </div>
    </Card>
  );

  return (
    <div className={styles.container}>
      {/* 隐藏的文件输入元素 */}
      <input
        id="file-input"
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <input
        id="camera-input"
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraCapture}
      />
      
      <NavBar onBack={handleBack}>
        {currentStep === 0 ? '报销受理' : `报销受理 - ${steps[currentStep].title}`}
      </NavBar>
      
      {/* 步骤指示器 */}
      <div className={styles.stepperContainer}>
        <div className={styles.stepper}>
          {steps.map((step, index) => (
            <div 
              key={index} 
              className={`${styles.step} ${index <= currentStep ? styles.active : ''}`}
            >
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepTitle}>{step.title}</div>
              <div className={styles.stepDescription}>{step.description}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className={styles.content}>
        {renderStepContent()}
      </div>
    </div>
  );
};

export default ReimbursementPage; 