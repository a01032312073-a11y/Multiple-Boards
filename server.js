const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

// Helper: 데이터 읽기
function readPosts() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading posts:', err);
    return [];
  }
}

// Helper: 데이터 저장
function savePosts(posts) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving posts:', err);
  }
}

// Helper: JSON 응답
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, x-user-id'
  });
  res.end(JSON.stringify(data));
}

// Helper: Request body 파싱
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// Helper: 관리자 권한 확인
function checkIsAdmin(req, query) {
  const token = req.headers['x-admin-token'] || (query && query.adminToken);
  return token === ADMIN_PASSWORD;
}

// Helper: 사용자 ID 추출
function getUserId(req, query, body) {
  return (
    (body && body.userId) ||
    req.headers['x-user-id'] ||
    (query && query.userId) ||
    'anonymous'
  );
}

// MIME 타입 매핑
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 정적 파일 서빙
function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(__dirname, 'public', safePath);

  // 상위 경로 탈출 방지
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

// HTTP 서버 생성
const server = http.createServer(async (req, res) => {
  // CORS 사전 요청 처리
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-admin-token, x-user-id'
    });
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const { pathname, query } = parsedUrl;
  const method = req.method;

  // API 라우팅
  if (pathname.startsWith('/api/')) {
    const isAdmin = checkIsAdmin(req, query);

    // 1. 관리자 비밀번호 검증
    if (pathname === '/api/admin/verify' && method === 'POST') {
      const body = await parseBody(req);
      if (body.password === ADMIN_PASSWORD) {
        return sendJSON(res, 200, { success: true, message: '관리자 인증 성공' });
      } else {
        return sendJSON(res, 401, { success: false, message: '비밀번호가 올바르지 않습니다.' });
      }
    }

    // 2. 글 목록 조회: GET /api/posts
    if (pathname === '/api/posts' && method === 'GET') {
      const posts = readPosts();
      const currentUserId = getUserId(req, query);
      const sortBy = (query && query.sort) || 'latest';

      // 정렬 처리
      let sorted = [...posts];
      if (sortBy === 'likes') {
        sorted.sort((a, b) => ((b.likedBy || []).length) - ((a.likedBy || []).length));
      } else if (sortBy === 'views') {
        sorted.sort((a, b) => (b.views || 0) - (a.views || 0));
      } else {
        sorted.sort((a, b) => b.id - a.id);
      }

      const result = sorted.map(post => {
        const isPrivate = post.visibility === 'private';
        const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
        const likesCount = likedBy.length;
        const isLiked = likedBy.includes(currentUserId);

        if (isPrivate && !isAdmin) {
          // 비공개 글은 목록에 "🔒 비공개 글입니다"로만 표시 (요구사항 ①)
          return {
            id: post.id,
            title: '🔒 비공개 글입니다',
            author: '***',
            createdAt: post.createdAt,
            views: post.views,
            visibility: 'private',
            editPermission: post.editPermission,
            allowLikes: false,
            likesCount: 0,
            isLiked: false,
            isLocked: post.editPermission === 'locked',
            isMasked: true
          };
        }

        return {
          id: post.id,
          title: post.title,
          author: post.author,
          createdAt: post.createdAt,
          views: post.views,
          visibility: post.visibility,
          editPermission: post.editPermission,
          allowLikes: !!post.allowLikes,
          likesCount: likesCount,
          isLiked: isLiked,
          isLocked: post.editPermission === 'locked',
          isMasked: false
        };
      });

      return sendJSON(res, 200, { posts: result, isAdmin });
    }

    // 3. 단일 글 상세 조회: GET /api/posts/:id
    const postDetailMatch = pathname.match(/^\/api\/posts\/(\d+)$/);
    if (postDetailMatch && method === 'GET') {
      const id = parseInt(postDetailMatch[1], 10);
      const posts = readPosts();
      const postIndex = posts.findIndex(p => p.id === id);

      if (postIndex === -1) {
        return sendJSON(res, 404, { success: false, message: '게시글을 찾을 수 없습니다.' });
      }

      const post = posts[postIndex];
      const isPrivate = post.visibility === 'private';

      // 비공개 글인데 관리자가 아니면 열람 제한 (요구사항 ①)
      if (isPrivate && !isAdmin) {
        return sendJSON(res, 403, {
          success: false,
          isPrivate: true,
          message: '관리자만 열람할 수 있는 비공개 글입니다.'
        });
      }

      // 조회수 증가 및 저장
      post.views = (post.views || 0) + 1;
      savePosts(posts);

      const currentUserId = getUserId(req, query);
      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];

      return sendJSON(res, 200, {
        success: true,
        post: {
          id: post.id,
          title: post.title,
          author: post.author,
          content: post.content,
          createdAt: post.createdAt,
          views: post.views,
          visibility: post.visibility,
          editPermission: post.editPermission,
          allowLikes: !!post.allowLikes,
          likesCount: likedBy.length,
          isLiked: likedBy.includes(currentUserId),
          likedBy: post.allowLikes ? likedBy : []
        }
      });
    }

    // 4. 글 작성: POST /api/posts
    if (pathname === '/api/posts' && method === 'POST') {
      const body = await parseBody(req);
      const { title, author, content, visibility, editPermission, password, allowLikes } = body;

      if (!title || !author || !content) {
        return sendJSON(res, 400, { success: false, message: '제목, 작성자, 내용을 모두 입력해주세요.' });
      }

      // 옵션 2: 비밀번호 권한 선택 시 비밀번호 필수
      if (editPermission === 'password' && (!password || password.trim() === '')) {
        return sendJSON(res, 400, { success: false, message: '비밀번호를 입력해주세요.' });
      }

      const posts = readPosts();
      const nextId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;

      const newPost = {
        id: nextId,
        title: title.trim(),
        author: author.trim(),
        content: content.trim(),
        createdAt: new Date().toISOString(),
        views: 0,
        visibility: visibility === 'private' ? 'private' : 'public',
        editPermission: editPermission === 'locked' ? 'locked' : 'password',
        password: editPermission === 'password' ? String(password).trim() : '',
        allowLikes: allowLikes === true || allowLikes === 'true',
        likedBy: []
      };

      posts.push(newPost);
      savePosts(posts);

      return sendJSON(res, 201, { success: true, post: newPost });
    }

    // 5. 공감 토글: POST /api/posts/:id/like (요구사항 ③ 및 사용자 요청)
    // "공감허용 된 글에는 한사람 당 한번만 공감 누를 수 있고 한 번 더 누르면 취소 되게 해줘"
    const likeMatch = pathname.match(/^\/api\/posts\/(\d+)\/like$/);
    if (likeMatch && method === 'POST') {
      const id = parseInt(likeMatch[1], 10);
      const body = await parseBody(req);
      const userId = getUserId(req, query, body);

      if (!userId) {
        return sendJSON(res, 400, { success: false, message: '사용자 정보가 필요합니다.' });
      }

      const posts = readPosts();
      const post = posts.find(p => p.id === id);

      if (!post) {
        return sendJSON(res, 404, { success: false, message: '게시글을 찾을 수 없습니다.' });
      }

      // 옵션 3: 공감 허용 여부 체크
      if (!post.allowLikes) {
        return sendJSON(res, 400, { success: false, message: '공감이 허용되지 않은 게시글입니다.' });
      }

      if (!Array.isArray(post.likedBy)) {
        post.likedBy = [];
      }

      const existingIndex = post.likedBy.indexOf(userId);
      let isLiked = false;
      let actionMessage = '';

      if (existingIndex >= 0) {
        // 이미 공감한 사용자: 공감 취소
        post.likedBy.splice(existingIndex, 1);
        isLiked = false;
        actionMessage = '공감이 취소되었습니다.';
      } else {
        // 아직 공감 안 한 사용자: 공감 추가 (1인 1공감 보장)
        post.likedBy.push(userId);
        isLiked = true;
        actionMessage = '공감되었습니다!';
      }

      savePosts(posts);

      return sendJSON(res, 200, {
        success: true,
        isLiked: isLiked,
        likesCount: post.likedBy.length,
        message: actionMessage
      });
    }

    // 6. 글 수정: PUT /api/posts/:id
    const editMatch = pathname.match(/^\/api\/posts\/(\d+)$/);
    if (editMatch && method === 'PUT') {
      const id = parseInt(editMatch[1], 10);
      const body = await parseBody(req);
      const posts = readPosts();
      const post = posts.find(p => p.id === id);

      if (!post) {
        return sendJSON(res, 404, { success: false, message: '게시글을 찾을 수 없습니다.' });
      }

      // 옵션 2: 수정 권한 체크 (수정 불가(잠금)인 경우 누구도 고칠 수 없음)
      if (post.editPermission === 'locked') {
        return sendJSON(res, 403, {
          success: false,
          message: '수정 불가(잠금)로 설정된 글은 등록 후 누구도 고칠 수 없습니다.'
        });
      }

      // 비밀번호 검증 (관리자이거나 작성 비밀번호 일치)
      if (!isAdmin && post.password !== String(body.password).trim()) {
        return sendJSON(res, 401, { success: false, message: '비밀번호가 일치하지 않습니다.' });
      }

      // 수정 필드 반영
      if (body.title) post.title = body.title.trim();
      if (body.content) post.content = body.content.trim();
      if (body.visibility) post.visibility = body.visibility === 'private' ? 'private' : 'public';
      if (body.allowLikes !== undefined) post.allowLikes = body.allowLikes === true || body.allowLikes === 'true';

      savePosts(posts);

      return sendJSON(res, 200, { success: true, post, message: '글이 수정되었습니다.' });
    }

    // 7. 글 삭제: DELETE /api/posts/:id
    const deleteMatch = pathname.match(/^\/api\/posts\/(\d+)$/);
    if (deleteMatch && method === 'DELETE') {
      const id = parseInt(deleteMatch[1], 10);
      const body = await parseBody(req);
      const posts = readPosts();
      const postIndex = posts.findIndex(p => p.id === id);

      if (postIndex === -1) {
        return sendJSON(res, 404, { success: false, message: '게시글을 찾을 수 없습니다.' });
      }

      const post = posts[postIndex];

      // 비밀번호 검증 (관리자이거나 작성 비밀번호 일치)
      if (!isAdmin && post.password !== String(body.password).trim()) {
        return sendJSON(res, 401, { success: false, message: '비밀번호가 일치하지 않습니다.' });
      }

      posts.splice(postIndex, 1);
      savePosts(posts);

      return sendJSON(res, 200, { success: true, message: '글이 삭제되었습니다.' });
    }

    return sendJSON(res, 404, { success: false, message: '알 수 없는 API 경로입니다.' });
  }

  // 정적 파일 서빙
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`게시판 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
