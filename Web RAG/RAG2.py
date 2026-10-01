from flask import Flask, request, jsonify
from docx import Document
import chromadb
import torch
import os
from transformers import AutoTokenizer, AutoModelForCausalLM
from sentence_transformers import SentenceTransformer, models
import mysql.connector
import PyPDF2
import pandas as pd
from datetime import datetime


app = Flask(__name__)


EMBEDDING_MODEL_PATH = "intfloat/multilingual-e5-large"
LLM_MODEL_PATH = "MediaTek-Research/Breeze-7B-Instruct-v1_0"

class RAGServer:
    def __init__(self):
        self.embedder = None
        self.llm = None
        self.collection = None
        self.db_config = {
            'host': 'localhost',
            'user': 'root',
            'password': '12345',
            'database': 'chatbot',
            'charset': 'utf8mb4'
        }
        self._initialize_components()
        self._init_database_table()

    def _initialize_components(self):
        """初始化所有组件并处理异常"""
        try:
            
            self.embedder = self._init_embedder()
            
            self.llm = self._init_llm()
            
            self.collection = self._init_database()

            print("系統初始化完成！")
        except Exception as e:
            print(f"初始化失敗: {str(e)}")
            raise RuntimeError("服務器啟動失敗，請檢查文件")

    def _init_embedder(self):
        
        print("正在加载模型...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        word_embedding_model = models.Transformer(EMBEDDING_MODEL_PATH)
        pooling_model = models.Pooling(word_embedding_model.get_word_embedding_dimension())
        return SentenceTransformer(
            modules=[word_embedding_model, pooling_model],
            device=device
        )

    def _init_llm(self):
        
        print("正在載入語言模型...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL_PATH)
        model = AutoModelForCausalLM.from_pretrained(
            LLM_MODEL_PATH,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto"
        )
        return {"tokenizer": tokenizer, "model": model}

    def _init_database(self):
       
        print("正在初始化資料庫...")
        client = chromadb.Client()
        collection = client.get_or_create_collection(name="docx_collection")
        data_dir = r'C:\Users\user\Desktop\web\訓練資料R'
        
        for filename in os.listdir(data_dir):
            file_path = os.path.join(data_dir, filename)
            chunks = []
            
            # 不同文件類型選擇的讀取方法
            if filename.endswith('.docx'):
                chunks = self._read_and_split_docx(file_path)
            elif filename.endswith('.pdf'):
                chunks = self._read_and_split_pdf(file_path)
            elif filename.endswith('.txt'):
                chunks = self._read_and_split_txt(file_path)
            elif filename.endswith(('.xlsx', '.xls')):
                chunks = self._read_and_split_excel(file_path)
                
            # 將內容添加到資料庫
            for idx, chunk in enumerate(chunks):
                if chunk.strip():  # 確保內容不為空
                    embedding = self.embedder.encode(chunk).tolist()
                    collection.add(
                        ids=[f"{filename}_{idx}"],
                        embeddings=[embedding],
                        documents=[chunk]
                    )
        return collection

    def _read_and_split_docx(self, file_path):
        """讀取docx文件"""
        doc = Document(file_path)
        return [para.text for para in doc.paragraphs if para.text.strip()]

    def _read_and_split_pdf(self, file_path):
        """讀取PDF文件"""
        chunks = []
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text = page.extract_text()
                    if text:
                        paragraphs = text.split('\n\n')
                        chunks.extend([p.strip() for p in paragraphs if p.strip()])
        except Exception as e:
            print(f"讀取PDF文件 {file_path} 時出錯: {str(e)}")
        return chunks

    def _read_and_split_txt(self, file_path):
        """讀取TXT文件"""
        chunks = []
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                text = file.read()
                paragraphs = text.split('\n\n')
                chunks.extend([p.strip() for p in paragraphs if p.strip()])
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='big5') as file:
                    text = file.read()
                    paragraphs = text.split('\n\n')
                    chunks.extend([p.strip() for p in paragraphs if p.strip()])
            except Exception as e:
                print(f"讀取TXT文件 {file_path} 時出錯: {str(e)}")
        except Exception as e:
            print(f"讀取TXT文件 {file_path} 時出錯: {str(e)}")
        return chunks

    def _read_and_split_excel(self, file_path):
        """讀取Excel文件"""
        chunks = []
        try:
            df_list = pd.read_excel(file_path, sheet_name=None)
            for sheet_name, df in df_list.items():
                chunks.append(f"Sheet: {sheet_name}")
                columns = df.columns.tolist()
                for index, row in df.iterrows():
                    row_text = " | ".join([f"{col}: {row[col]}" for col in columns])
                    chunks.append(row_text)
                chunks.append("-" * 50)
        except Exception as e:
            print(f"讀取Excel文件 {file_path} 時出錯: {str(e)}")
        return chunks

    def generate_answer(self, question: str):
        """生成回答的完整流程（增強檢索 + 調整長度累積邏輯）"""
        try:
            # 產生 query 向量
            embedding = self.embedder.encode(question).tolist()

            # 執行語意檢索，取得前20筆
            results = self.collection.query(
                query_embeddings=[embedding],
                n_results=20,
                include=["documents", "distances"]
            )
            retrieved_docs = results.get('documents', [[]])[0]
            distances = results.get('distances', [[]])[0]

            # 累積長度邏輯（確保 context 足夠豐富）
            context_docs = []
            total_length = 0
            if retrieved_docs and distances and len(retrieved_docs) == len(distances):
                sorted_results = sorted(zip(retrieved_docs, distances), key=lambda x: x[1])
                for doc, dist in sorted_results:
                    context_docs.append(doc)
                    total_length += len(doc)
                    print(f"添加文檔: 距離={dist:.4f}, 長度={len(doc)}, 總長={total_length}")
                    if total_length > 1000:
                        break
            else:
                context_docs = retrieved_docs[:3]

            context = "\n\n".join(context_docs)

            # 回退預設上下文
            if not context or len(context.strip()) < 10:
                context = "亞洲大學資訊傳播學系是亞大重要的學術單位，請提供更多明確問題。"
                print("檢索結果不足，使用預設上下文")

            # 建構提示詞
            prompt = f"""**【聲明】「學系」、「系上」、「系所」、「資傳系」、「亞大資傳系」、「資傳」均指「亞洲大學資訊傳播學系」。**
請根據檢索到的內容，嚴格僅依據此內容回答問題。如果檢索內容不足以回答問題，請直接回答"不好意思，我是亞洲大學資傳系小幫手，只了解亞大資傳系的問題。"，不要引入額外資訊，並使用繁體中文回答：
【檢索到的相關內容】
{context}

【問題】
{question}

【回答】"""

            # 模型生成
            inputs = self.llm['tokenizer'](prompt, return_tensors="pt").to(self.llm['model'].device)
            outputs = self.llm['model'].generate(
                **inputs,
                max_length=8192,
                temperature=0.1,
                top_p=0.9
            )
            answer = self.llm['tokenizer'].decode(outputs[0], skip_special_tokens=True)

            # 回傳【回答】段落後的內容
            if "【回答】" in answer:
                answer = answer.split("【回答】")[-1].strip()

            return answer

        except Exception as e:
            print(f"回答生成失敗: {str(e)}")
            return "我只知道亞洲大學資傳系的問題。"

    def _init_database_table(self):
        """初始化MySQL數據表"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_data (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    detailed_time DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """)
            conn.commit()
            cursor.close()
            conn.close()
            print("MySQL數據表初始化成功！")
        except Exception as e:
            print(f"MySQL數據表初始化失敗: {str(e)}")

    def save_to_database(self, question: str, answer: str):
        """將對話儲存進數據庫"""
        try:
            conn = mysql.connector.connect(**self.db_config)
            cursor = conn.cursor()
            sql = "INSERT INTO `chat_data` (question, answer) VALUES (%s, %s)"
            cursor.execute(sql, (question, answer))
            conn.commit()
            cursor.close()
            conn.close()
            print("對話已保存進數據庫")
        except Exception as e:
            print(f"儲存進數據庫失敗: {str(e)}")

# 初始化服務器組件
rag_server = RAGServer()

@app.route('/qa', methods=['POST'])
def handle_question():
    try:
        question = request.form.get('question', '').strip()
        if not question:
            return jsonify({
                "status": "error",
                "message": "請輸入問題，問題不能為空值"
            }), 400
        
        answer = rag_server.generate_answer(question)
        if not answer:
            raise RuntimeError("回答生成失敗")
            
        # 保存到數據庫
        rag_server.save_to_database(question, answer)
            
        return jsonify({
            "status": "success",
            "answer": answer
        }), 200, {'Content-Type': 'application/json; charset=utf-8'}
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"處理請求時發生錯誤: {str(e)}"
        }), 500

# 添加 CORS 支持
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response

@app.route('/status', methods=['GET'])
def check_status():
    return jsonify({
        "status": "online",
        "model": LLM_MODEL_PATH,
        "message": "RAG Server is running"
    }), 200

@app.route('/ask', methods=['POST'])
def ask_question():
    try:
        data = request.get_json() if request.is_json else request.form
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({
                "status": "error",
                "message": "請輸入問題"
            }), 400
        
        answer = rag_server.generate_answer(question)
        if not answer:
            raise RuntimeError("回答生成失敗")
            
        # 保存到數據庫
        rag_server.save_to_database(question, answer)
            
        return jsonify({
            "status": "success",
            "answer": answer
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"處理請求時發生錯誤: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, ssl_context=('fullchain.pem', 'privkey.pem'))




