/**
 * 스마트 멀티 게시판 v2.0
 * - 8대 필수 기능: 조회 / 작성 / 회원가입·로그인 / 댓글 / 파일첨부 / 검색 / 알림 / 게시글추천
 * - 실명 가입 & 닉네임 활동 (프로필에서 닉네임 실시간 변경 가능)
 * - 브라우저 완전 종료 후 재접속 시에도 100% 영구 저장 유지 (LocalStorage)
 * - 이미지 명세 3대 옵션 (공개범위 비공개 마스킹 / 수정잠금 / 1인 1추천 토글)
 */

(function () {
  'use strict';

  // ==========================================
  // 스토리지 키 정의 (완전한 영구성 보장)
  // ==========================================
  const STORAGE_KEYS = {
    USERS: 'unseo_multi_users',
    CURRENT_USER: 'unseo_multi_current_user',
    POSTS: 'unseo_multi_posts',
    NOTIFICATIONS: 'unseo_multi_notifications'
  };

  // 다중 게시판 정의
  const BOARDS = {
    all: { id: 'all', name: '전체 글 보기', desc: '모든 게시판의 글을 통합하여 조회합니다.', icon: '🌐' },
    notice: { id: 'notice', name: '공지사항', desc: '운영팀의 중요 공지 및 업데이트 소식을 확인하세요.', icon: '📢' },
    free: { id: 'free', name: '자유게시판', desc: '자유롭게 일상과 생각을 나누는 소통 공간입니다.', icon: '💬' },
    qna: { id: 'qna', name: 'Q&A 질문답변', desc: '궁금한 점을 질문하고 유용한 답변을 나누어보세요.', icon: '❓' },
    data: { id: 'data', name: '자료실', desc: '문서, 이미지, 유용한 파일을 공유하는 공간입니다.', icon: '📁' }
  };

  // 기본 사용자 (초기 1회 자동 생성)
  const INITIAL_USERS = [
    {
      id: 'admin',
      userId: 'admin',
      realName: '김관리',
      nickname: '총괄관리자',
      password: 'admin1234',
      role: 'admin',
      createdAt: '2026-11-10T09:00:00.000Z'
    },
    {
      id: 'user1',
      userId: 'user1',
      realName: '홍길동',
      nickname: '행복한사자',
      password: '1234',
      role: 'user',
      createdAt: '2026-11-10T10:00:00.000Z'
    },
    {
      id: 'user2',
      userId: 'user2',
      realName: '이영희',
      nickname: '개발요정',
      password: '1234',
      role: 'user',
      createdAt: '2026-11-10T10:30:00.000Z'
    }
  ];

  // 기본 게시글 샘플 (초기 1회 자동 생성)
  const INITIAL_POSTS = [
    {
      id: 5,
      boardId: 'notice',
      title: '📢 [과제 제출] 바이브 코딩 개발 게시판 GitHub 공개 레포지토리 주소 안내',
      authorUserId: 'admin',
      authorNickname: '총괄관리자',
      content: '📌 바이브 코딩으로 개발된 스마트 멀티 게시판 GitHub 공개 레포지토리 제출 안내입니다.\n\n🔗 GitHub 저장소 URL: https://github.com/a01032312073/unseo-board\n\n📄 관련 개발 보고서 및 산출물:\n- DEVELOPMENT_REPORT.md (기능 설명, 사용 프롬프트 및 에이전트 응답 기록)\n- multi_board_architecture_plan.md (다중 게시판 및 복합 다중 게시판 아키텍처)\n- README.md (프로젝트 실행 가이드)\n\n※ 브라우저에서 [새 글 작성]을 통해 본인의 최종 GitHub 공개 레포지토리 링크를 직접 등록하거나 이 글을 수정하실 수도 있습니다.',
      createdAt: '2026-11-10T16:55:00.000Z',
      views: 99,
      visibility: 'public',
      editPermission: 'password',
      password: 'admin',
      allowLikes: true,
      likedBy: ['user1', 'user2'],
      file: null,
      comments: [
        {
          id: 10,
          authorUserId: 'user1',
          authorNickname: '행복한사자',
          content: 'GitHub 레포지토리 주소와 개발 보고서(DEVELOPMENT_REPORT.md)가 완벽히 포함되어 있습니다!',
          createdAt: '2026-11-10T16:56:00.000Z'
        }
      ]
    },
    {
      id: 1,
      boardId: 'notice',
      title: '스마트 멀티 게시판 오픈 안내 (실명가입 & 닉네임 활동)',
      authorUserId: 'admin',
      authorNickname: '총괄관리자',
      content: '안녕하세요! 다중 게시판 시스템에 오신 것을 환영합니다.\n\n가입 시 신원 확인을 위해 [실명]으로 가입하지만, 게시판 활동은 원하는 [닉네임]으로 자유롭게 활동하실 수 있습니다.\n\n이 글은 [추천 허용]으로 설정되어 있어 하단의 👍 추천하기 버튼을 누를 수 있습니다.\n한 사람당 한 번만 추천할 수 있으며, 다시 누르면 취소됩니다!',
      createdAt: '2026-11-10T10:00:00.000Z',
      views: 45,
      visibility: 'public',
      editPermission: 'password',
      password: 'admin',
      allowLikes: true,
      likedBy: ['user1'], // user1(행복한사자)이 이미 추천함
      file: null,
      comments: [
        {
          id: 1,
          authorUserId: 'user1',
          authorNickname: '행복한사자',
          content: '첫 공지 잘 확인했습니다! 닉네임 기능 정말 좋네요~',
          createdAt: '2026-11-10T10:15:00.000Z'
        }
      ]
    },
    {
      id: 2,
      boardId: 'notice',
      title: '2026년 내부 운영 기밀 지침서 (관리자 전용)',
      authorUserId: 'admin',
      authorNickname: '총괄관리자',
      content: '본 문서는 관리자 전용 대외비 문서입니다.\n\n일반 사용자에게는 목록에 "🔒 비공개 글입니다"로만 표시되며 열람이 차단됩니다.\n관리자(admin) 계정으로 로그인해야만 본문을 확인할 수 있습니다.',
      createdAt: '2026-11-10T11:00:00.000Z',
      views: 7,
      visibility: 'private',
      editPermission: 'password',
      password: 'admin',
      allowLikes: false,
      likedBy: [],
      file: null,
      comments: []
    },
    {
      id: 3,
      boardId: 'free',
      title: '오늘 점심 메뉴 추천받습니다! (댓글 달아주세요)',
      authorUserId: 'user1',
      authorNickname: '행복한사자',
      content: '다들 오늘 점심 뭐 드시나요? 맛있는 메뉴 추천해주시면 감사하겠습니다!\n추천(공감) 버튼도 꾹 눌러주세요~ 😊',
      createdAt: '2026-11-10T12:30:00.000Z',
      views: 29,
      visibility: 'public',
      editPermission: 'password',
      password: '1234',
      allowLikes: true,
      likedBy: ['user2'],
      file: null,
      comments: [
        {
          id: 2,
          authorUserId: 'user2',
          authorNickname: '개발요정',
          content: '따뜻한 김치찌개 추천합니다!',
          createdAt: '2026-11-10T12:35:00.000Z'
        }
      ]
    },
    {
      id: 4,
      boardId: 'data',
      title: '게시판 시스템 아키텍처 다이어그램 및 설계 문서',
      authorUserId: 'user2',
      authorNickname: '개발요정',
      content: '게시판 시스템의 핵심 설계 구조 안내입니다.\n\n이 글은 [수정 불가(잠금)]으로 설정되어 있어 등록 후 누구도 수정할 수 없습니다.',
      createdAt: '2026-11-10T13:00:00.000Z',
      views: 38,
      visibility: 'public',
      editPermission: 'locked',
      password: '',
      allowLikes: false,
      likedBy: [],
      file: {
        name: 'architecture_v2.png',
        size: '128 KB',
        type: 'image/png',
        dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="240" viewBox="0 0 600 240"><rect width="100%" height="100%" fill="%232563eb"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-size="22" font-family="sans-serif" font-weight="bold">스마트 멀티 게시판 설계도</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="%23dbeafe" font-size="14" font-family="sans-serif">8대 기능 / 다중 게시판 / 1인 1추천 토글 시스템</text></svg>'
      },
      comments: []
    }
  ];

  // ==========================================
  // 영구 스토리지 매니저 (LocalStorage Database)
  // ==========================================
  const StorageDB = {
    // 1. 회원 관리
    getUsers() {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
        return INITIAL_USERS;
      }
      try {
        return JSON.parse(data);
      } catch (e) {
        return INITIAL_USERS;
      }
    },

    saveUsers(users) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    },

    getCurrentUser() {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (!data) {
        // 기본값: 'user1' (홍길동 / 행복한사자) 자동 로그인 세팅
        const defaultUser = INITIAL_USERS[1];
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
        return defaultUser;
      }
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    },

    setCurrentUser(user) {
      if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    },

    // 2. 게시글 관리
    getPosts() {
      const data = localStorage.getItem(STORAGE_KEYS.POSTS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(INITIAL_POSTS));
        return INITIAL_POSTS;
      }
      try {
        return JSON.parse(data);
      } catch (e) {
        return INITIAL_POSTS;
      }
    },

    savePosts(posts) {
      localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    },

    // 3. 알림 관리
    getNotifications() {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (!data) return [];
      try {
        return JSON.parse(data);
      } catch (e) {
        return [];
      }
    },

    saveNotifications(notifs) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    },

    addNotification(targetUserId, message, postId) {
      const notifs = this.getNotifications();
      const newNotif = {
        id: Date.now(),
        targetUserId,
        message,
        postId,
        read: false,
        createdAt: new Date().toISOString()
      };
      notifs.unshift(newNotif);
      this.saveNotifications(notifs);
    }
  };

  // ==========================================
  // 앱 상태 변수 (State)
  // ==========================================
  let currentUser = StorageDB.getCurrentUser();
  let currentBoardId = 'all';
  let currentFilter = 'all';
  let currentSort = 'latest';
  let searchQuery = '';
  let activeDetailPost = null;
  let isEditing = false;
  let editTargetId = null;
  let attachedFileObj = null;

  // ==========================================
  // DOM 요소 참조
  // ==========================================
  // 헤더 & 인증 UI
  const loggedOutNav = document.getElementById('loggedOutNav');
  const loggedInNav = document.getElementById('loggedInNav');
  const openLoginBtn = document.getElementById('openLoginBtn');
  const openRegisterBtn = document.getElementById('openRegisterBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const openProfileBtn = document.getElementById('openProfileBtn');
  const headerNickname = document.getElementById('headerNickname');
  const headerRealname = document.getElementById('headerRealname');
  const headerAdminBadge = document.getElementById('headerAdminBadge');
  const quickAccountSelect = document.getElementById('quickAccountSelect');

  // 알림 UI
  const notifWrapper = document.getElementById('notifWrapper');
  const notifBellBtn = document.getElementById('notifBellBtn');
  const notifBadge = document.getElementById('notifBadge');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifList = document.getElementById('notifList');
  const notifClearBtn = document.getElementById('notifClearBtn');

  // 다중 게시판 탭 & 툴바
  const boardTabs = document.getElementById('boardTabs');
  const currentBoardDesc = document.getElementById('currentBoardDesc');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const boardTableBody = document.getElementById('boardTableBody');
  const emptyState = document.getElementById('emptyState');
  const emptyWriteBtn = document.getElementById('emptyWriteBtn');
  const openWriteModalBtn = document.getElementById('openWriteModalBtn');

  // 글 작성 모달
  const writeModal = document.getElementById('writeModal');
  const writeModalTitle = document.getElementById('writeModalTitle');
  const writeForm = document.getElementById('writeForm');
  const postBoardSelect = document.getElementById('postBoardSelect');
  const postAuthorDisplay = document.getElementById('postAuthorDisplay');
  const postTitle = document.getElementById('postTitle');
  const postContent = document.getElementById('postContent');
  const postFileInput = document.getElementById('postFileInput');
  const filePreviewArea = document.getElementById('filePreviewArea');
  const filePreviewName = document.getElementById('filePreviewName');
  const removeFileBtn = document.getElementById('removeFileBtn');
  const savePostBtn = document.getElementById('savePostBtn');

  // 글 상세 모달
  const detailModal = document.getElementById('detailModal');
  const detailBadgeBoard = document.getElementById('detailBadgeBoard');
  const detailBadgeVisibility = document.getElementById('detailBadgeVisibility');
  const detailBadgeEdit = document.getElementById('detailBadgeEdit');
  const detailBadgeLike = document.getElementById('detailBadgeLike');
  const detailTitle = document.getElementById('detailTitle');
  const detailAuthor = document.getElementById('detailAuthor');
  const detailDate = document.getElementById('detailDate');
  const detailViews = document.getElementById('detailViews');
  const detailContent = document.getElementById('detailContent');
  const detailFileSection = document.getElementById('detailFileSection');
  const detailFileName = document.getElementById('detailFileName');
  const detailFileSize = document.getElementById('detailFileSize');
  const detailFileDownload = document.getElementById('detailFileDownload');
  const detailImagePreviewContainer = document.getElementById('detailImagePreviewContainer');
  const detailImagePreview = document.getElementById('detailImagePreview');

  // 추천(공감) UI
  const likeSection = document.getElementById('likeSection');
  const noLikeSection = document.getElementById('noLikeSection');
  const likeButton = document.getElementById('likeButton');
  const likeBtnLabel = document.getElementById('likeBtnLabel');
  const detailLikesCount = document.getElementById('detailLikesCount');
  const likedUsersContainer = document.getElementById('likedUsersContainer');

  // 댓글 UI
  const commentCountBadge = document.getElementById('commentCountBadge');
  const commentForm = document.getElementById('commentForm');
  const commentContentInput = document.getElementById('commentContentInput');
  const commentAuthorDisplay = document.getElementById('commentAuthorDisplay');
  const commentList = document.getElementById('commentList');

  // 상세 액션 버튼
  const detailEditBtn = document.getElementById('detailEditBtn');
  const detailDeleteBtn = document.getElementById('detailDeleteBtn');

  // 회원가입 모달
  const registerModal = document.getElementById('registerModal');
  const registerForm = document.getElementById('registerForm');
  const regUserId = document.getElementById('regUserId');
  const regRealName = document.getElementById('regRealName');
  const regNickname = document.getElementById('regNickname');
  const regPassword = document.getElementById('regPassword');

  // 로그인 모달
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const loginUserId = document.getElementById('loginUserId');
  const loginPassword = document.getElementById('loginPassword');

  // 프로필 모달 (닉네임 변경)
  const profileModal = document.getElementById('profileModal');
  const profileForm = document.getElementById('profileForm');
  const profileUserId = document.getElementById('profileUserId');
  const profileRealName = document.getElementById('profileRealName');
  const profileNickname = document.getElementById('profileNickname');

  // 비밀번호 확인 모달
  const passwordModal = document.getElementById('passwordModal');
  const passwordModalTitle = document.getElementById('passwordModalTitle');
  const passwordModalDesc = document.getElementById('passwordModalDesc');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const confirmPasswordBtn = document.getElementById('confirmPasswordBtn');
  let passwordModalCallback = null;

  // 토스트
  const toastContainer = document.getElementById('toastContainer');

  // ==========================================
  // 유틸리티 함수
  // ==========================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function openModal(modal) {
    modal.classList.add('show');
  }

  function closeModal(modal) {
    modal.classList.remove('show');
  }

  // ==========================================
  // 1. 회원 및 인증 관리 (실명 가입 & 닉네임 활동)
  // ==========================================
  function updateAuthUI() {
    currentUser = StorageDB.getCurrentUser();
    const users = StorageDB.getUsers();

    if (currentUser) {
      loggedOutNav.style.display = 'none';
      loggedInNav.style.display = 'flex';
      notifWrapper.style.display = 'block';

      headerNickname.textContent = currentUser.nickname;
      headerRealname.textContent = `(${currentUser.realName})`;
      headerAdminBadge.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';

      postAuthorDisplay.value = `${currentUser.nickname} (${currentUser.realName})`;
      commentAuthorDisplay.textContent = currentUser.nickname;

      // 빠른 계정 전환 옵션 채우기
      quickAccountSelect.innerHTML = '<option value="">계정 전환...</option>' + users.map(u => {
        const isCur = u.id === currentUser.id ? ' (현재)' : '';
        return `<option value="${u.id}" ${u.id === currentUser.id ? 'disabled' : ''}>${u.nickname} (${u.realName})${isCur}</option>`;
      }).join('');

      // 알림 배지 갱신
      updateNotificationBadge();
    } else {
      loggedOutNav.style.display = 'flex';
      loggedInNav.style.display = 'none';
      notifWrapper.style.display = 'none';

      postAuthorDisplay.value = '게스트';
      commentAuthorDisplay.textContent = '게스트';
    }
  }

  // 빠른 계정 전환 리스너
  quickAccountSelect.addEventListener('change', () => {
    const targetId = quickAccountSelect.value;
    if (!targetId) return;

    const users = StorageDB.getUsers();
    const targetUser = users.find(u => u.id === targetId);
    if (targetUser) {
      StorageDB.setCurrentUser(targetUser);
      currentUser = targetUser;
      updateAuthUI();
      showToast(`'${currentUser.nickname}' (${currentUser.realName}) 님으로 계정이 전환되었습니다.`, 'info');
      loadAndRenderPosts();

      // 열려있는 상세 모달이 있으면 리로드
      if (detailModal.classList.contains('show') && activeDetailPost) {
        openDetailModal(activeDetailPost.id);
      }
    }
  });

  // 회원가입 처리 (실명 필수, 닉네임 활동)
  registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = regUserId.value.trim();
    const realName = regRealName.value.trim();
    const nickname = regNickname.value.trim();
    const password = regPassword.value.trim();

    if (!userId || !realName || !nickname || !password) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    const users = StorageDB.getUsers();
    if (users.some(u => u.userId === userId)) {
      alert('이미 사용 중인 아이디입니다.');
      regUserId.focus();
      return;
    }

    const newUser = {
      id: 'user_' + Date.now(),
      userId,
      realName,
      nickname,
      password,
      role: userId === 'admin' ? 'admin' : 'user',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    StorageDB.saveUsers(users);
    StorageDB.setCurrentUser(newUser);

    closeModal(registerModal);
    registerForm.reset();
    updateAuthUI();
    showToast(`환영합니다, ${newUser.nickname}님! 실명(${newUser.realName})으로 인증 완료되었습니다.`, 'success');
  });

  // 로그인 처리
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const userId = loginUserId.value.trim();
    const password = loginPassword.value.trim();

    const users = StorageDB.getUsers();
    const user = users.find(u => u.userId === userId && u.password === password);

    if (user) {
      StorageDB.setCurrentUser(user);
      closeModal(loginModal);
      loginForm.reset();
      updateAuthUI();
      showToast(`로그인 성공! 안녕하세요, ${user.nickname}님.`, 'success');
      loadAndRenderPosts();

      if (detailModal.classList.contains('show') && activeDetailPost) {
        openDetailModal(activeDetailPost.id);
      }
    } else {
      alert('아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  });

  // 로그아웃 처리
  logoutBtn.addEventListener('click', () => {
    if (confirm('로그아웃 하시겠습니까?')) {
      StorageDB.setCurrentUser(null);
      currentUser = null;
      updateAuthUI();
      showToast('로그아웃 되었습니다.', 'info');
      loadAndRenderPosts();
    }
  });

  // 프로필 모달 열기 & 닉네임 변경
  openProfileBtn.addEventListener('click', () => {
    if (!currentUser) return;
    profileUserId.value = currentUser.userId;
    profileRealName.value = currentUser.realName;
    profileNickname.value = currentUser.nickname;
    openModal(profileModal);
  });

  profileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newNickname = profileNickname.value.trim();
    if (!newNickname) {
      alert('변경할 닉네임을 입력해주세요.');
      return;
    }

    const oldNickname = currentUser.nickname;
    currentUser.nickname = newNickname;

    // 1. 유저 스토리지 갱신
    const users = StorageDB.getUsers();
    const target = users.find(u => u.id === currentUser.id);
    if (target) target.nickname = newNickname;
    StorageDB.saveUsers(users);
    StorageDB.setCurrentUser(currentUser);

    // 2. 게시글 및 댓글의 닉네임 일괄 동기화 (새 닉네임으로 즉시 활동)
    const posts = StorageDB.getPosts();
    posts.forEach(p => {
      if (p.authorUserId === currentUser.id) {
        p.authorNickname = newNickname;
      }
      if (Array.isArray(p.comments)) {
        p.comments.forEach(c => {
          if (c.authorUserId === currentUser.id) {
            c.authorNickname = newNickname;
          }
        });
      }
    });
    StorageDB.savePosts(posts);

    closeModal(profileModal);
    updateAuthUI();
    showToast(`닉네임이 '${oldNickname}'에서 '${newNickname}'(으)로 변경되었습니다!`, 'success');
    loadAndRenderPosts();

    if (detailModal.classList.contains('show') && activeDetailPost) {
      openDetailModal(activeDetailPost.id);
    }
  });

  // ==========================================
  // 2. 알림 시스템 (Notification System)
  // ==========================================
  function updateNotificationBadge() {
    if (!currentUser) return;
    const notifs = StorageDB.getNotifications().filter(n => n.targetUserId === currentUser.id);
    const unreadCount = notifs.filter(n => !n.read).length;

    if (unreadCount > 0) {
      notifBadge.style.display = 'inline-block';
      notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    } else {
      notifBadge.style.display = 'none';
    }
  }

  function renderNotifications() {
    if (!currentUser) return;
    const notifs = StorageDB.getNotifications().filter(n => n.targetUserId === currentUser.id);

    if (notifs.length === 0) {
      notifList.innerHTML = '<div class="notif-empty">새로운 알림이 없습니다.</div>';
      return;
    }

    notifList.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}" data-post-id="${n.postId}">
        <div>${escapeHtml(n.message)}</div>
        <span class="notif-item-time">${formatDate(n.createdAt)}</span>
      </div>
    `).join('');
  }

  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    renderNotifications();
    notifDropdown.classList.toggle('show');
  });

  notifList.addEventListener('click', (e) => {
    const item = e.target.closest('.notif-item');
    if (!item) return;

    const notifId = parseInt(item.getAttribute('data-notif-id'), 10);
    const postId = parseInt(item.getAttribute('data-post-id'), 10);

    // 읽음 처리
    const notifs = StorageDB.getNotifications();
    const target = notifs.find(n => n.id === notifId);
    if (target) target.read = true;
    StorageDB.saveNotifications(notifs);

    updateNotificationBadge();
    notifDropdown.classList.remove('show');

    if (postId) {
      openDetailModal(postId);
    }
  });

  notifClearBtn.addEventListener('click', () => {
    if (!currentUser) return;
    let notifs = StorageDB.getNotifications();
    notifs = notifs.filter(n => n.targetUserId !== currentUser.id);
    StorageDB.saveNotifications(notifs);
    renderNotifications();
    updateNotificationBadge();
    showToast('모든 알림을 삭제했습니다.', 'info');
  });

  document.addEventListener('click', (e) => {
    if (!notifWrapper.contains(e.target)) {
      notifDropdown.classList.remove('show');
    }
  });

  // ==========================================
  // 3. 다중 게시판 탭 & 필터 & 정렬
  // ==========================================
  boardTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.board-tab');
    if (!btn) return;

    document.querySelectorAll('.board-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentBoardId = btn.getAttribute('data-board');
    currentBoardDesc.textContent = BOARDS[currentBoardId] ? BOARDS[currentBoardId].desc : '';
    loadAndRenderPosts();
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      loadAndRenderPosts();
    });
  });

  sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    loadAndRenderPosts();
  });

  function handleSearch() {
    searchQuery = searchInput.value.trim().toLowerCase();
    loadAndRenderPosts();
  }
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('input', handleSearch);

  // ==========================================
  // 4. 게시글 목록 렌더링
  // ==========================================
  function loadAndRenderPosts() {
    const rawPosts = StorageDB.getPosts();
    const isAdmin = currentUser && currentUser.role === 'admin';

    // 1. 게시판 필터
    let filtered = rawPosts.filter(p => {
      if (currentBoardId === 'all') return true;
      return p.boardId === currentBoardId;
    });

    // 2. 탭 필터
    filtered = filtered.filter(p => {
      if (currentFilter === 'public') return p.visibility === 'public';
      if (currentFilter === 'private') return p.visibility === 'private';
      if (currentFilter === 'likes') return !!p.allowLikes;
      if (currentFilter === 'hasFile') return !!p.file;
      return true;
    });

    // 3. 검색어 필터
    if (searchQuery) {
      filtered = filtered.filter(p => {
        const titleMatch = (p.title || '').toLowerCase().includes(searchQuery);
        const contentMatch = (p.content || '').toLowerCase().includes(searchQuery);
        const authorMatch = (p.authorNickname || '').toLowerCase().includes(searchQuery);
        return titleMatch || contentMatch || authorMatch;
      });
    }

    // 4. 정렬
    filtered.sort((a, b) => {
      if (currentSort === 'likes') {
        return (b.likedBy ? b.likedBy.length : 0) - (a.likedBy ? a.likedBy.length : 0);
      }
      if (currentSort === 'views') {
        return (b.views || 0) - (a.views || 0);
      }
      if (currentSort === 'comments') {
        return (b.comments ? b.comments.length : 0) - (a.comments ? a.comments.length : 0);
      }
      return b.id - a.id; // latest
    });

    if (filtered.length === 0) {
      boardTableBody.innerHTML = '';
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';
    boardTableBody.innerHTML = filtered.map(post => {
      const isPrivate = post.visibility === 'private';
      const isLocked = post.editPermission === 'locked';
      const allowLikes = post.allowLikes;
      const boardInfo = BOARDS[post.boardId] || BOARDS.free;

      // 뱃지
      const boardBadge = `<span class="badge badge-board-${post.boardId}">${boardInfo.icon} ${boardInfo.name}</span>`;
      const visBadge = isPrivate
        ? '<span class="badge badge-private">🔒 비공개</span>'
        : '<span class="badge badge-public">🌐 전체</span>';
      const lockBadge = isLocked ? '<span class="badge badge-locked">🔒 잠금</span>' : '';
      const fileBadge = post.file ? '<span title="파일 첨부됨" style="margin-left:4px;">📎</span>' : '';

      // 추천 열
      let likeHtml = '<span class="table-like-cell table-like-none">-</span>';
      if (allowLikes) {
        const isLikedByMe = currentUser && Array.isArray(post.likedBy) && post.likedBy.includes(currentUser.id);
        const count = post.likedBy ? post.likedBy.length : 0;
        likeHtml = `<span class="table-like-cell ${isLikedByMe ? 'table-like-active' : ''}">👍 ${count}</span>`;
      }

      // 제목 및 비공개 처리 (요구사항 ①: 비공개 글은 목록에 "🔒 비공개 글입니다"로만 표시)
      let titleDisplay = post.title;
      let titleClass = 'post-title-text';
      if (isPrivate && !isAdmin) {
        titleDisplay = '🔒 비공개 글입니다';
        titleClass = 'post-title-text is-private';
      }

      const commentCount = post.comments && post.comments.length > 0 ? ` <span style="color:#2563eb; font-weight:700;">[${post.comments.length}]</span>` : '';

      return `
        <tr data-post-id="${post.id}">
          <td>${post.id}</td>
          <td>${boardBadge}</td>
          <td>
            <div style="display: flex; gap: 4px; justify-content: center; flex-wrap: wrap;">
              ${visBadge}
              ${lockBadge}
            </div>
          </td>
          <td>
            <div class="post-title-cell">
              <span class="${titleClass}">${escapeHtml(titleDisplay)}</span>
              ${fileBadge}
              ${commentCount}
            </div>
          </td>
          <td>${escapeHtml(post.authorNickname || '익명')}</td>
          <td>${formatDate(post.createdAt)}</td>
          <td>${post.views || 0}</td>
          <td>${likeHtml}</td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // 5. 게시글 상세 조회
  // ==========================================
  function openDetailModal(postId) {
    const posts = StorageDB.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) {
      showToast('게시글을 찾을 수 없습니다.', 'error');
      return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';

    // 옵션 ①: 비공개 글 체크 (관리자만 열람 가능)
    if (post.visibility === 'private' && !isAdmin) {
      showPasswordModal('🔒 비공개 게시글 열람 안내', '이 글은 <strong>비공개(관리자만 열람)</strong>로 설정되어 있습니다.<br>관리자(admin) 계정으로 로그인해야 열람할 수 있습니다.', (pw) => {
        if (pw === 'admin1234' || pw === 'admin') {
          showToast('관리자 인증 완료!', 'success');
          openDetailModal(postId);
        } else {
          alert('관리자 비밀번호가 일치하지 않습니다.');
        }
      });
      return;
    }

    // 조회수 증가 및 영구 저장
    post.views = (post.views || 0) + 1;
    StorageDB.savePosts(posts);

    activeDetailPost = post;

    // 모달 데이터 바인딩
    const boardInfo = BOARDS[post.boardId] || BOARDS.free;
    detailBadgeBoard.className = `badge badge-board-${post.boardId}`;
    detailBadgeBoard.textContent = `${boardInfo.icon} ${boardInfo.name}`;

    detailBadgeVisibility.className = post.visibility === 'private' ? 'badge badge-private' : 'badge badge-public';
    detailBadgeVisibility.textContent = post.visibility === 'private' ? '🔒 비공개' : '🌐 전체공개';

    detailBadgeEdit.className = post.editPermission === 'locked' ? 'badge badge-locked' : 'badge badge-editable';
    detailBadgeEdit.textContent = post.editPermission === 'locked' ? '🔒 수정 불가(잠금)' : '🔑 수정 가능';

    detailTitle.textContent = post.title;
    detailAuthor.textContent = `${post.authorNickname} (작성자)`;
    detailDate.textContent = formatDate(post.createdAt);
    detailViews.textContent = post.views;
    detailContent.textContent = post.content;

    // 첨부 파일 렌더링
    if (post.file) {
      detailFileSection.style.display = 'block';
      detailFileName.textContent = post.file.name;
      detailFileSize.textContent = `(${post.file.size})`;
      detailFileDownload.href = post.file.dataUrl || '#';
      detailFileDownload.download = post.file.name;

      // 이미지 파일인 경우 미리보기
      if (post.file.type && post.file.type.startsWith('image/')) {
        detailImagePreviewContainer.style.display = 'block';
        detailImagePreview.src = post.file.dataUrl;
      } else {
        detailImagePreviewContainer.style.display = 'none';
      }
    } else {
      detailFileSection.style.display = 'none';
      detailImagePreviewContainer.style.display = 'none';
    }

    // 옵션 ③: 추천(공감) 버튼 & 추천자 칩 렌더링 (1인 1추천 토글)
    if (post.allowLikes) {
      detailBadgeLike.className = 'badge badge-like-allowed';
      detailBadgeLike.textContent = '👍 추천 허용';
      likeSection.style.display = 'flex';
      noLikeSection.style.display = 'none';
      renderLikeSection(post);
    } else {
      detailBadgeLike.className = 'badge badge-like-disabled';
      detailBadgeLike.textContent = '🚫 추천 비허용';
      likeSection.style.display = 'none';
      noLikeSection.style.display = 'block';
    }

    // 옵션 ②: 수정 불가(잠금) 버튼 상태 설정
    if (post.editPermission === 'locked') {
      detailEditBtn.innerHTML = '🔒 수정 불가(잠금)';
      detailEditBtn.classList.add('btn-secondary');
      detailEditBtn.classList.remove('btn-outline');
    } else {
      detailEditBtn.innerHTML = '✏️ 수정';
      detailEditBtn.classList.remove('btn-secondary');
      detailEditBtn.classList.add('btn-outline');
    }

    // 댓글 목록 렌더링
    renderComments(post);

    openModal(detailModal);
  }

  // 1인 1추천 토글 UI 렌더링
  function renderLikeSection(post) {
    if (!Array.isArray(post.likedBy)) post.likedBy = [];
    const isLiked = currentUser && post.likedBy.includes(currentUser.id);
    const count = post.likedBy.length;

    detailLikesCount.textContent = count;
    if (isLiked) {
      likeButton.classList.add('liked');
      likeBtnLabel.textContent = '추천 취소';
      likeButton.title = '추천을 취소하려면 클릭하세요.';
    } else {
      likeButton.classList.remove('liked');
      likeBtnLabel.textContent = '추천하기';
      likeButton.title = '이 글을 추천합니다. (1인 1회)';
    }

    // 추천한 회원 닉네임 칩 렌더링
    const users = StorageDB.getUsers();
    if (count > 0) {
      const chipHtml = post.likedBy.map(uid => {
        const u = users.find(x => x.id === uid);
        const name = u ? u.nickname : uid;
        return `<span class="liked-user-chip">👍 ${escapeHtml(name)}</span>`;
      }).join('');
      likedUsersContainer.innerHTML = `<span style="font-size:12px; color:#64748b; width:100%; text-align:center; margin-bottom:4px;">이 글을 추천한 사람:</span> ${chipHtml}`;
    } else {
      likedUsersContainer.innerHTML = '';
    }
  }

  // 추천 버튼 클릭 (1인 1추천 토글 이벤트)
  likeButton.addEventListener('click', () => {
    if (!currentUser) {
      alert('추천 기능은 로그인 후 이용하실 수 있습니다.');
      openModal(loginModal);
      return;
    }
    if (!activeDetailPost) return;

    likeButton.classList.add('pop');
    setTimeout(() => likeButton.classList.remove('pop'), 350);

    const posts = StorageDB.getPosts();
    const post = posts.find(p => p.id === activeDetailPost.id);
    if (!post) return;

    if (!Array.isArray(post.likedBy)) post.likedBy = [];
    const idx = post.likedBy.indexOf(currentUser.id);

    if (idx >= 0) {
      // 이미 추천함 -> 취소
      post.likedBy.splice(idx, 1);
      showToast('추천이 취소되었습니다.', 'info');
    } else {
      // 아직 안 함 -> 1인 1추천 추가
      post.likedBy.push(currentUser.id);
      showToast('게시글을 추천했습니다! 👍', 'success');

      // 작성자에게 알림 발송 (자신이 쓴 글이 아닌 경우)
      if (post.authorUserId && post.authorUserId !== currentUser.id) {
        StorageDB.addNotification(
          post.authorUserId,
          `'${currentUser.nickname}'님이 회원님의 글 '${post.title}'을 추천했습니다! 👍`,
          post.id
        );
      }
    }

    // 영구 저장
    StorageDB.savePosts(posts);
    activeDetailPost = post;

    renderLikeSection(post);
    loadAndRenderPosts();
    updateNotificationBadge();
  });

  // ==========================================
  // 6. 댓글 시스템 (Comments)
  // ==========================================
  function renderComments(post) {
    if (!Array.isArray(post.comments)) post.comments = [];
    commentCountBadge.textContent = post.comments.length;

    if (post.comments.length === 0) {
      commentList.innerHTML = '<div class="comment-empty">등록된 댓글이 없습니다. 첫 댓글을 남겨보세요!</div>';
      return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';

    commentList.innerHTML = post.comments.map(c => {
      const isMyComment = currentUser && currentUser.id === c.authorUserId;
      const canDelete = isMyComment || isAdmin;
      const delBtnHtml = canDelete ? `<button class="comment-del-btn" data-comment-id="${c.id}">삭제</button>` : '';

      return `
        <div class="comment-item">
          <div class="comment-item-header">
            <div>
              <span class="comment-author">${escapeHtml(c.authorNickname)}</span>
              <span class="comment-date">${formatDate(c.createdAt)}</span>
            </div>
            ${delBtnHtml}
          </div>
          <div class="comment-content">${escapeHtml(c.content)}</div>
        </div>
      `;
    }).join('');
  }

  // 댓글 작성
  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('댓글을 작성하려면 먼저 로그인해주세요.');
      openModal(loginModal);
      return;
    }
    if (!activeDetailPost) return;

    const content = commentContentInput.value.trim();
    if (!content) return;

    const posts = StorageDB.getPosts();
    const post = posts.find(p => p.id === activeDetailPost.id);
    if (!post) return;

    if (!Array.isArray(post.comments)) post.comments = [];

    const newComment = {
      id: Date.now(),
      authorUserId: currentUser.id,
      authorNickname: currentUser.nickname,
      content,
      createdAt: new Date().toISOString()
    };

    post.comments.push(newComment);
    StorageDB.savePosts(posts);
    activeDetailPost = post;

    commentContentInput.value = '';
    renderComments(post);
    loadAndRenderPosts();
    showToast('댓글이 등록되었습니다.', 'success');

    // 글 작성자에게 실시간 알림 발송
    if (post.authorUserId && post.authorUserId !== currentUser.id) {
      StorageDB.addNotification(
        post.authorUserId,
        `'${currentUser.nickname}'님이 회원님의 글 '${post.title}'에 댓글을 남겼습니다: "${content.substring(0, 20)}..."`,
        post.id
      );
      updateNotificationBadge();
    }
  });

  // 댓글 삭제
  commentList.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.comment-del-btn');
    if (!delBtn) return;

    const commentId = parseInt(delBtn.getAttribute('data-comment-id'), 10);
    if (!confirm('이 댓글을 삭제하시겠습니까?')) return;

    const posts = StorageDB.getPosts();
    const post = posts.find(p => p.id === activeDetailPost.id);
    if (!post || !Array.isArray(post.comments)) return;

    post.comments = post.comments.filter(c => c.id !== commentId);
    StorageDB.savePosts(posts);
    activeDetailPost = post;

    renderComments(post);
    loadAndRenderPosts();
    showToast('댓글이 삭제되었습니다.', 'info');
  });

  // ==========================================
  // 7. 파일 첨부 처리 (FileReader base64)
  // ==========================================
  postFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 용량 제한 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 최대 5MB까지 첨부할 수 있습니다.');
      postFileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      attachedFileObj = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type,
        dataUrl: event.target.result
      };
      filePreviewName.textContent = `📎 ${file.name} (${attachedFileObj.size})`;
      filePreviewArea.style.display = 'flex';
    };
    reader.readAsDataURL(file);
  });

  removeFileBtn.addEventListener('click', () => {
    attachedFileObj = null;
    postFileInput.value = '';
    filePreviewArea.style.display = 'none';
  });

  // ==========================================
  // 8. 새 글 작성 & 수정 처리
  // ==========================================
  openWriteModalBtn.addEventListener('click', () => {
    if (!currentUser) {
      alert('게시글을 작성하려면 로그인이 필요합니다.');
      openModal(loginModal);
      return;
    }

    isEditing = false;
    editTargetId = null;
    attachedFileObj = null;
    writeModalTitle.textContent = '✏️ 새 글 작성';
    savePostBtn.textContent = '게시글 등록';
    writeForm.reset();

    // 현재 게시판으로 기본값 세팅
    if (currentBoardId !== 'all') {
      postBoardSelect.value = currentBoardId;
    } else {
      postBoardSelect.value = 'free';
    }

    postAuthorDisplay.value = `${currentUser.nickname} (${currentUser.realName})`;
    filePreviewArea.style.display = 'none';

    document.querySelector('input[name="visibility"][value="public"]').checked = true;
    document.querySelector('input[name="editPermission"][value="password"]').checked = true;
    document.querySelector('input[name="allowLikes"][value="true"]').checked = true;

    openModal(writeModal);
  });

  emptyWriteBtn.addEventListener('click', () => openWriteModalBtn.click());

  writeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const boardId = postBoardSelect.value;
    const title = postTitle.value.trim();
    const content = postContent.value.trim();
    const visibility = document.querySelector('input[name="visibility"]:checked').value;
    const editPermission = document.querySelector('input[name="editPermission"]:checked').value;
    const allowLikes = document.querySelector('input[name="allowLikes"]:checked').value === 'true';

    if (!title || !content) {
      alert('제목과 내용을 모두 입력해주세요.');
      return;
    }

    const posts = StorageDB.getPosts();

    if (isEditing) {
      // 글 수정
      const post = posts.find(p => p.id === editTargetId);
      if (post) {
        post.boardId = boardId;
        post.title = title;
        post.content = content;
        post.visibility = visibility;
        post.allowLikes = allowLikes;
        if (attachedFileObj) post.file = attachedFileObj;

        StorageDB.savePosts(posts);
        showToast('게시글이 성공적으로 수정되었습니다.', 'success');
        closeModal(writeModal);
        loadAndRenderPosts();
        openDetailModal(post.id);
      }
    } else {
      // 새 글 작성
      const nextId = posts.length > 0 ? Math.max(...posts.map(p => p.id)) + 1 : 1;
      const newPost = {
        id: nextId,
        boardId,
        title,
        authorUserId: currentUser.id,
        authorNickname: currentUser.nickname,
        content,
        createdAt: new Date().toISOString(),
        views: 0,
        visibility,
        editPermission,
        password: currentUser.password || '1234',
        allowLikes,
        likedBy: [],
        file: attachedFileObj,
        comments: []
      };

      posts.unshift(newPost);
      StorageDB.savePosts(posts);

      showToast('새 게시글이 등록되었습니다!', 'success');
      closeModal(writeModal);
      loadAndRenderPosts();
      openDetailModal(newPost.id);
    }
  });

  // 상세에서 수정 클릭 (옵션 ②: 잠금 체크)
  detailEditBtn.addEventListener('click', () => {
    if (!activeDetailPost) return;

    // 잠금 글 수정 불가
    if (activeDetailPost.editPermission === 'locked') {
      alert('🔒 이 글은 "수정 불가(잠금)"로 설정되어 등록 후 누구도 수정할 수 없습니다.');
      return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';
    const isAuthor = currentUser && currentUser.id === activeDetailPost.authorUserId;

    if (!isAdmin && !isAuthor) {
      showPasswordModal('✏️ 글 수정 - 비밀번호 확인', '작성자 확인을 위해 비밀번호를 입력해주세요.', (pw) => {
        if (pw === activeDetailPost.password) {
          startEditPost(activeDetailPost);
        } else {
          alert('비밀번호가 일치하지 않습니다.');
        }
      });
      return;
    }

    startEditPost(activeDetailPost);
  });

  function startEditPost(post) {
    isEditing = true;
    editTargetId = post.id;
    attachedFileObj = post.file;

    writeModalTitle.textContent = '✏️ 게시글 수정';
    savePostBtn.textContent = '수정 완료';

    postBoardSelect.value = post.boardId || 'free';
    postTitle.value = post.title;
    postContent.value = post.content;

    if (post.file) {
      filePreviewName.textContent = `📎 ${post.file.name} (${post.file.size})`;
      filePreviewArea.style.display = 'flex';
    } else {
      filePreviewArea.style.display = 'none';
    }

    const visRadio = document.querySelector(`input[name="visibility"][value="${post.visibility}"]`);
    if (visRadio) visRadio.checked = true;

    const editRadio = document.querySelector(`input[name="editPermission"][value="${post.editPermission}"]`);
    if (editRadio) editRadio.checked = true;

    const likeRadio = document.querySelector(`input[name="allowLikes"][value="${post.allowLikes ? 'true' : 'false'}"]`);
    if (likeRadio) likeRadio.checked = true;

    closeModal(detailModal);
    openModal(writeModal);
  }

  // 상세에서 삭제 클릭
  detailDeleteBtn.addEventListener('click', () => {
    if (!activeDetailPost) return;

    const isAdmin = currentUser && currentUser.role === 'admin';
    const isAuthor = currentUser && currentUser.id === activeDetailPost.authorUserId;

    if (!isAdmin && !isAuthor) {
      showPasswordModal('🗑️ 글 삭제 - 비밀번호 확인', '삭제 권한 확인을 위해 비밀번호를 입력해주세요.', (pw) => {
        if (pw === activeDetailPost.password) {
          executeDeletePost(activeDetailPost.id);
        } else {
          alert('비밀번호가 일치하지 않습니다.');
        }
      });
      return;
    }

    if (confirm(`'${activeDetailPost.title}' 글을 정말 삭제하시겠습니까?`)) {
      executeDeletePost(activeDetailPost.id);
    }
  });

  function executeDeletePost(postId) {
    let posts = StorageDB.getPosts();
    posts = posts.filter(p => p.id !== postId);
    StorageDB.savePosts(posts);

    showToast('게시글이 삭제되었습니다.', 'info');
    closeModal(detailModal);
    loadAndRenderPosts();
  }

  // ==========================================
  // 9. 비밀번호 확인 모달 유틸
  // ==========================================
  function showPasswordModal(title, desc, callback) {
    passwordModalTitle.innerHTML = title;
    passwordModalDesc.innerHTML = desc;
    confirmPasswordInput.value = '';
    passwordModalCallback = callback;
    openModal(passwordModal);
    confirmPasswordInput.focus();
  }

  confirmPasswordBtn.addEventListener('click', () => {
    const val = confirmPasswordInput.value.trim();
    if (!val) {
      alert('비밀번호를 입력해주세요.');
      return;
    }
    closeModal(passwordModal);
    if (passwordModalCallback) {
      passwordModalCallback(val);
    }
  });

  confirmPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') confirmPasswordBtn.click();
  });

  // ==========================================
  // 10. 모달 공통 닫기 이벤트
  // ==========================================
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const target = document.getElementById(modalId);
      if (target) closeModal(target);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // 모달 오픈 단축 버튼들
  openLoginBtn.addEventListener('click', () => openModal(loginModal));
  openRegisterBtn.addEventListener('click', () => openModal(registerModal));

  // 테이블 행 클릭 -> 상세 조회
  boardTableBody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    const postId = parseInt(tr.getAttribute('data-post-id'), 10);
    if (postId) openDetailModal(postId);
  });

  // ==========================================
  // 초기화 실행
  // ==========================================
  updateAuthUI();
  loadAndRenderPosts();
})();
