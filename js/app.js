// 全局变量
let originalData = [];
let processedData = [];
let originalChart = null;
let finalChart = null;

// DOM元素
const fileInput = document.getElementById('file-input');
const pasteTextarea = document.getElementById('paste-textarea');
const processDataBtn = document.getElementById('process-data-btn');
const processDataPasteBtn = document.getElementById('process-data-paste-btn');
const downloadTemplateBtn = document.getElementById('download-template-btn');
const exportResultBtn = document.getElementById('export-result-btn');
const restartBtn = document.getElementById('restart-btn');
const dataTable = document.getElementById('data-table');
const resultsTable = document.getElementById('results-table');
const originalChartCanvas = document.getElementById('original-chart');
const finalChartCanvas = document.getElementById('final-chart');
const statsContainer = document.getElementById('stats-container');
const resultsSection = document.getElementById('results-section');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const accordionItems = document.querySelectorAll('.accordion-item');
const importTabs = document.querySelectorAll('.import-tab');
const importContents = document.querySelectorAll('.import-content');
const customWeightsToggle = document.getElementById('custom-weights-toggle');
const defaultWeightsInfo = document.getElementById('default-weights-info');
const customWeightsContainer = document.getElementById('custom-weights-container');
const addWeightBtn = document.getElementById('add-weight-btn');
const weightTotalError = document.getElementById('weight-total-error');
const weightItems = document.getElementById('weight-items');

// 初始化权重项
const defaultWeights = [
    { name: '考试成绩', weight: 0.5, fixed: true },
    { name: '笔记', weight: 0.3, fixed: false },
    { name: '出勤', weight: 0.2, fixed: false }
];

let customWeights = [...defaultWeights];

// 事件监听器
fileInput.addEventListener('change', handleFileUpload);
pasteTextarea.addEventListener('input', function() {
    if (pasteTextarea.value.trim() !== '') {
        processDataPasteBtn.disabled = false;
    } else {
        processDataPasteBtn.disabled = true;
    }
});
processDataBtn.addEventListener('click', processData);
processDataPasteBtn.addEventListener('click', processPastedData);
downloadTemplateBtn.addEventListener('click', downloadTemplate);
exportResultBtn.addEventListener('click', exportResults);
restartBtn.addEventListener('click', restart);

// 标签页切换
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// 导入标签页切换
importTabs.forEach(btn => {
    btn.addEventListener('click', () => {
        importTabs.forEach(b => b.classList.remove('active'));
        importContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.target).classList.add('active');
    });
});

// 手风琴效果
accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
        item.classList.toggle('active');
    });
});

// 自定义权重切换
customWeightsToggle.addEventListener('change', function() {
    if (this.checked) {
        defaultWeightsInfo.classList.add('hidden');
        customWeightsContainer.classList.remove('hidden');
        // 初始化自定义权重项
        renderWeightItems();
    } else {
        defaultWeightsInfo.classList.remove('hidden');
        customWeightsContainer.classList.add('hidden');
        // 重置为默认权重
        customWeights = [...defaultWeights];
    }
});

// 添加权重项
addWeightBtn.addEventListener('click', function() {
    customWeights.push({ name: '', weight: 0, fixed: false });
    renderWeightItems();
    checkWeightTotal();
});

// 渲染权重项
function renderWeightItems() {
    weightItems.innerHTML = '';
    
    customWeights.forEach((item, index) => {
        const weightItem = document.createElement('div');
        weightItem.className = 'weight-item';
        
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = '评分项名称';
        nameInput.value = item.name;
        nameInput.readOnly = item.fixed;
        nameInput.addEventListener('input', function() {
            customWeights[index].name = this.value;
        });
        
        const weightInput = document.createElement('input');
        weightInput.type = 'number';
        weightInput.placeholder = '权重';
        weightInput.min = 0;
        weightInput.max = 1;
        weightInput.step = 0.1;
        weightInput.value = item.weight;
        weightInput.addEventListener('input', function() {
            customWeights[index].weight = parseFloat(this.value) || 0;
            checkWeightTotal();
        });
        
        const removeBtn = document.createElement('button');
        removeBtn.disabled = item.fixed;
        removeBtn.innerHTML = '<span>×</span>';
        removeBtn.addEventListener('click', function() {
            if (!item.fixed) {
                customWeights.splice(index, 1);
                renderWeightItems();
                checkWeightTotal();
            }
        });
        
        weightItem.appendChild(nameInput);
        weightItem.appendChild(weightInput);
        weightItem.appendChild(removeBtn);
        weightItems.appendChild(weightItem);
    });
}

// 检查权重总和
function checkWeightTotal() {
    const total = customWeights.reduce((sum, item) => sum + item.weight, 0);
    const rounded = Math.round(total * 100) / 100; // 四舍五入到两位小数
    
    if (rounded !== 1) {
        weightTotalError.textContent = `权重总和必须为1，当前总和为${rounded}`;
        weightTotalError.classList.remove('hidden');
        processDataBtn.disabled = true;
        processDataPasteBtn.disabled = true;
    } else {
        weightTotalError.classList.add('hidden');
        processDataBtn.disabled = false;
        processDataPasteBtn.disabled = pasteTextarea.value.trim() === '';
    }
}

// 处理粘贴的数据
function processPastedData() {
    const text = pasteTextarea.value.trim();
    if (!text) return;
    
    try {
        // 尝试解析粘贴的数据
        const rows = text.split('\n');
        const headers = rows[0].split('\t');
        
        // 确保至少有学生ID和考试成绩两列
        if (headers.length < 2) {
            throw new Error('数据格式不正确，至少需要学生ID和考试成绩两列');
        }
        
        const data = [];
        for (let i = 1; i < rows.length; i++) {
            if (!rows[i].trim()) continue; // 跳过空行
            
            const values = rows[i].split('\t');
            if (values.length !== headers.length) {
                throw new Error(`第${i+1}行的列数与表头不匹配`);
            }
            
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header.trim()] = values[index].trim();
            });
            
            // 确保有学生ID和考试成绩
            if (!rowData['学生ID'] || !rowData['考试成绩']) {
                throw new Error(`第${i+1}行缺少学生ID或考试成绩`);
            }
            
            // 确保考试成绩是数字
            const score = parseFloat(rowData['考试成绩']);
            if (isNaN(score)) {
                throw new Error(`第${i+1}行的考试成绩不是有效数字`);
            }
            
            rowData['考试成绩'] = score;
            data.push(rowData);
        }
        
        if (data.length === 0) {
            throw new Error('没有有效的数据行');
        }
        
        originalData = data;
        displayData(originalData);
        updateStats(originalData);
        processDataBtn.disabled = false;
    } catch (error) {
        alert(`解析数据失败: ${error.message}`);
    }
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'xlsx') {
        processExcelFile(file);
    } else if (fileExtension === 'csv') {
        processCSVFile(file);
    } else {
        alert('请上传.xlsx或.csv格式的文件');
    }
}

// 处理Excel文件
function processExcelFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 确保数据包含必要的字段
        if (jsonData.length > 0 && jsonData[0].hasOwnProperty('学生ID') && jsonData[0].hasOwnProperty('考试成绩')) {
            originalData = jsonData;
            displayData(originalData);
            updateStats(originalData);
        } else {
            alert('文件格式不正确，请确保包含学生ID和考试成绩列');
        }
    };
    reader.readAsArrayBuffer(file);
}

// 处理CSV文件
function processCSVFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        Papa.parse(e.target.result, {
            header: true,
            dynamicTyping: true,
            complete: function(results) {
                if (results.data.length > 0 && results.data[0].hasOwnProperty('学生ID') && results.data[0].hasOwnProperty('考试成绩')) {
                    originalData = results.data;
                    displayData(originalData);
                    updateStats(originalData);
                } else {
                    alert('文件格式不正确，请确保包含学生ID和考试成绩列');
                }
            },
            error: function(error) {
                alert('解析CSV文件失败: ' + error.message);
            }
        });
    };
    reader.readAsText(file);
}

// 显示数据
function displayData(data) {
    if (!data || data.length === 0) return;

    // 创建表头
    let headers = Object.keys(data[0]);
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // 创建表格行
    data.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${row[header]}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';

    dataTable.innerHTML = tableHTML;
    processDataBtn.disabled = false;
}

// 更新统计信息
function updateStats(data) {
    if (!data || data.length === 0) return;

    // 获取考试成绩数组
    const scores = data.map(item => parseFloat(item['考试成绩'])).filter(score => !isNaN(score));

    // 计算统计信息
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const sortedScores = [...scores].sort((a, b) => a - b);
    const median = sortedScores.length % 2 === 0 ?
        (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2 :
        sortedScores[Math.floor(sortedScores.length / 2)];
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // 更新统计信息显示
    statsContainer.innerHTML = `
        <div class="stat-item">
            <h3>平均分</h3>
            <p>${mean.toFixed(2)}</p>
        </div>
        <div class="stat-item">
            <h3>中位数</h3>
            <p>${median.toFixed(2)}</p>
        </div>
        <div class="stat-item">
            <h3>最低分</h3>
            <p>${min.toFixed(2)}</p>
        </div>
        <div class="stat-item">
            <h3>最高分</h3>
            <p>${max.toFixed(2)}</p>
        </div>
        <div class="stat-item">
            <h3>标准差</h3>
            <p>${stdDev.toFixed(2)}</p>
        </div>
    `;

    // 渲染原始考试成绩图表
    renderOriginalChart(scores);
}

// 处理数据
function processData() {
    if (originalData.length === 0) return;

    // 获取考试成绩数组
    const examScores = originalData.map(item => parseFloat(item['考试成绩'])).filter(score => !isNaN(score));

    // 计算原始考试成绩的统计信息
    const mean = examScores.reduce((sum, score) => sum + score, 0) / examScores.length;
    const variance = examScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / examScores.length;
    const stdDev = Math.sqrt(variance);

    // 使用自定义权重或默认权重
    const weights = customWeightsToggle.checked ? customWeights : defaultWeights;
    
    // 生成笔记和出勤成绩，使最终成绩符合正态分布
    processedData = originalData.map(student => {
        const result = { ...student };
        const examScore = parseFloat(student['考试成绩']);
        
        // 为每个权重项生成成绩（除了考试成绩）
        weights.forEach(item => {
            if (item.name !== '考试成绩' && !result[item.name]) {
                // 生成一个随机成绩，但确保与考试成绩有一定相关性
                const randomFactor = Math.random() * 0.4 + 0.8; // 0.8 到 1.2 之间的随机数
                let generatedScore = examScore * randomFactor;
                
                // 确保生成的成绩在合理范围内
                generatedScore = Math.max(0, Math.min(100, generatedScore));
                result[item.name] = generatedScore.toFixed(1);
            }
        });
        
        // 计算最终成绩
        result['最终成绩'] = calculateFinalScore(result, weights);
        
        return result;
    });
    
    // 调整成绩以符合正态分布
    adjustScoresToNormalDistribution();
    
    // 显示处理后的数据
    displayProcessedData();
}

// 调整成绩以符合正态分布
function adjustScoresToNormalDistribution() {
    // 获取当前最终成绩
    const finalScores = processedData.map(item => parseFloat(item['最终成绩']));
    
    // 计算当前统计信息
    const currentMean = finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length;
    const currentVariance = finalScores.reduce((sum, score) => sum + Math.pow(score - currentMean, 2), 0) / finalScores.length;
    const currentStdDev = Math.sqrt(currentVariance);
    
    // 目标正态分布参数
    const targetMean = 70; // 目标平均分
    const targetStdDev = 10; // 目标标准差
    
    // 调整最终成绩以符合目标正态分布
    processedData = processedData.map(student => {
        const result = { ...student };
        const finalScore = parseFloat(result['最终成绩']);
        
        // 标准化当前成绩
        const zScore = (finalScore - currentMean) / currentStdDev;
        
        // 应用目标分布参数
        const adjustedScore = zScore * targetStdDev + targetMean;
        
        // 确保调整后的成绩在合理范围内
        result['最终成绩'] = Math.max(0, Math.min(100, adjustedScore)).toFixed(1);
        
        return result;
    });
}

// 计算最终成绩
function calculateFinalScore(student, weights) {
    let finalScore = 0;
    
    weights.forEach(item => {
        const score = parseFloat(student[item.name]) || 0;
        finalScore += score * item.weight;
    });
    
    return finalScore.toFixed(1);
}

// 显示处理后的数据
function displayProcessedData() {
    if (!processedData || processedData.length === 0) return;

    // 创建表头
    let headers = Object.keys(processedData[0]);
    let tableHTML = '<thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    // 创建表格行
    processedData.forEach(row => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            tableHTML += `<td>${row[header]}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody>';

    resultsTable.innerHTML = tableHTML;
    resultsSection.classList.remove('hidden');
    exportResultBtn.disabled = false;

    // 渲染最终成绩图表
    const finalScores = processedData.map(item => parseFloat(item['最终成绩'])).filter(score => !isNaN(score));
    renderFinalChart(finalScores);
}

// 渲染原始考试成绩图表
function renderOriginalChart(scores) {
    if (originalChart) {
        originalChart.destroy();
    }

    const ctx = originalChartCanvas.getContext('2d');
    const { histogramData, normalCurveData } = createHistogramData(scores);

    originalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: histogramData.labels,
            datasets: [
                {
                    label: '频数',
                    data: histogramData.frequencies,
                    backgroundColor: 'rgba(74, 111, 165, 0.7)',
                    borderColor: 'rgba(74, 111, 165, 1)',
                    borderWidth: 1
                },
                {
                    label: '正态分布曲线',
                    data: normalCurveData,
                    type: 'line',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '分数'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '频数'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '原始考试成绩分布'
                }
            }
        }
    });
}

// 渲染最终成绩图表
function renderFinalChart(scores) {
    if (finalChart) {
        finalChart.destroy();
    }

    const ctx = finalChartCanvas.getContext('2d');
    const { histogramData, normalCurveData } = createHistogramData(scores);

    finalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: histogramData.labels,
            datasets: [
                {
                    label: '频数',
                    data: histogramData.frequencies,
                    backgroundColor: 'rgba(92, 184, 92, 0.7)',
                    borderColor: 'rgba(92, 184, 92, 1)',
                    borderWidth: 1
                },
                {
                    label: '正态分布曲线',
                    data: normalCurveData,
                    type: 'line',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '分数'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '频数'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: '最终成绩分布'
                }
            }
        }
    });
}

// 创建直方图数据
function createHistogramData(scores) {
    // 计算直方图的区间
    const min = Math.floor(Math.min(...scores) / 10) * 10;
    const max = Math.ceil(Math.max(...scores) / 10) * 10;
    const binSize = 5;
    const bins = [];

    for (let i = min; i <= max; i += binSize) {
        bins.push(i);
    }

    // 计算每个区间的频数
    const frequencies = Array(bins.length - 1).fill(0);
    scores.forEach(score => {
        for (let i = 0; i < bins.length - 1; i++) {
            if (score >= bins[i] && score < bins[i + 1]) {
                frequencies[i]++;
                break;
            }
        }
    });

    // 创建标签
    const labels = [];
    for (let i = 0; i < bins.length - 1; i++) {
        labels.push(`${bins[i]}-${bins[i + 1]}`);
    }

    // 计算正态分布曲线
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    const normalCurveData = [];
    const maxFreq = Math.max(...frequencies);

    for (let i = 0; i < bins.length - 1; i++) {
        const x = (bins[i] + bins[i + 1]) / 2;
        const y = (maxFreq / 0.4) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2)) / (stdDev * Math.sqrt(2 * Math.PI));
        normalCurveData.push(y);
    }

    return {
        histogramData: {
            labels: labels,
            frequencies: frequencies
        },
        normalCurveData: normalCurveData
    };
}

// 导出结果
function exportResults() {
    if (!processedData || processedData.length === 0) return;

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(processedData);

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '成绩结果');

    // 导出为xlsx文件
    XLSX.writeFile(wb, '成绩结果.xlsx');
}

// 下载模板
function downloadTemplate() {
    // 创建示例数据
    const templateData = [
        { '学生ID': '001', '姓名': '张三', '考试成绩': 85 },
        { '学生ID': '002', '姓名': '李四', '考试成绩': 72 },
        { '学生ID': '003', '姓名': '王五', '考试成绩': 63 },
        { '学生ID': '004', '姓名': '赵六', '考试成绩': 91 },
        { '学生ID': '005', '姓名': '钱七', '考试成绩': 78 }
    ];

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(wb, ws, '成绩模板');

    // 导出为xlsx文件
    XLSX.writeFile(wb, '成绩导入模板.xlsx');
}

// 重新开始
function restart() {
    // 清空数据
    originalData = [];
    processedData = [];
    
    // 重置输入
    fileInput.value = '';
    pasteTextarea.value = '';
    
    // 隐藏结果
    resultsSection.classList.add('hidden');
    dataTable.innerHTML = '';
    resultsTable.innerHTML = '';
    statsContainer.innerHTML = '';
    
    // 禁用按钮
    processDataBtn.disabled = true;
    processDataPasteBtn.disabled = true;
    exportResultBtn.disabled = true;
    
    // 销毁图表
    if (originalChart) {
        originalChart.destroy();
        originalChart = null;
    }
    if (finalChart) {
        finalChart.destroy();
        finalChart = null;
    }
    
    // 重置权重设置
    customWeightsToggle.checked = false;
    defaultWeightsInfo.classList.remove('hidden');
    customWeightsContainer.classList.add('hidden');
    customWeights = [...defaultWeights];
}