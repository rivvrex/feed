// --- Like & Save helpers (MUST be at the top!) ---
window.getLikedPosts = function() {
    return JSON.parse(localStorage.getItem('liked_posts') || '[]');
};
window.likePost = function(postId) {
    postId = postId.toString();
    let liked = window.getLikedPosts();
    if (!liked.includes(postId)) {
        liked.push(postId);
        localStorage.setItem('liked_posts', JSON.stringify(liked));
    }
};
window.unlikePost = function(postId) {
    postId = postId.toString();
    let liked = window.getLikedPosts();
    liked = liked.filter(id => id !== postId);
    localStorage.setItem('liked_posts', JSON.stringify(liked));
};
window.isPostLiked = function(postId) {
    postId = postId.toString();
    return window.getLikedPosts().includes(postId);
};
window.getSavedPosts = function() {
    return JSON.parse(localStorage.getItem('saved_posts') || '[]');
};
window.savePost = function(postId) {
    postId = postId.toString();
    let saved = window.getSavedPosts();
    if (!saved.includes(postId)) {
        saved.push(postId);
        localStorage.setItem('saved_posts', JSON.stringify(saved));
    }
};
window.unsavePost = function(postId) {
    postId = postId.toString();
    let saved = window.getSavedPosts();
    saved = saved.filter(id => id !== postId);
    localStorage.setItem('saved_posts', JSON.stringify(saved));
};
window.isPostSaved = function(postId) {
    postId = postId.toString();
    return window.getSavedPosts().includes(postId);
};

// Like, Save, Comment, Share, Notification Interactivity for all posts

function attachPostInteractivity(container=document) {
    console.log('attachPostInteractivity called on', container);
    // Like button (with persistence)
    container.querySelectorAll('.like-btn').forEach(function (btn) {
        console.log('Attaching like-btn handler to', btn);
        const postId = btn.dataset.postId;
        // Restore liked state
        if (isPostLiked(postId)) {
            btn.classList.add('liked');
            const icon = btn.querySelector('i');
            icon.classList.remove('bi-heart');
            icon.classList.add('bi-heart-fill');
            btn.style.color = '#e74c3c';
        }
        btn.onclick = function () {
            console.log('Like button clicked for post', postId);
            const icon = btn.querySelector('i');
            let count = parseInt(btn.textContent.replace(/\D/g, '')) || 0;
            if (!btn.classList.contains('liked')) {
                // Like the post (send AJAX to backend)
                fetch('/like_post', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `post_id=${postId}`
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        btn.classList.add('liked');
                        icon.classList.remove('bi-heart');
                        icon.classList.add('bi-heart-fill');
                        btn.style.color = '#e74c3c';
                        btn.childNodes[1].nodeValue = ' ' + data.likes.toLocaleString();
                        likePost(postId);
                    }
                });
            } else {
                // Unlike (send AJAX to backend)
                fetch('/unlike_post', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: `post_id=${postId}`
                })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        icon.classList.remove('bi-heart-fill');
                        icon.classList.add('bi-heart');
                        btn.style.color = '';
                        btn.classList.remove('liked');
                        btn.childNodes[1].nodeValue = ' ' + data.likes.toLocaleString();
                        unlikePost(postId);
                    }
                });
            }
        };
    });
    // Save button
    container.querySelectorAll('.save-btn').forEach(function (btn) {
        console.log('Attaching save-btn handler to', btn);
        const postId = btn.dataset.postId.toString();
        if (isPostSaved(postId)) {
            btn.classList.add('saved');
            btn.querySelector('i').classList.remove('bi-bookmark');
            btn.querySelector('i').classList.add('bi-bookmark-fill');
            btn.style.color = '#2196f3';
        }
        btn.onclick = function () {
            console.log('Save button clicked for post', postId);
            const icon = btn.querySelector('i');
            btn.classList.toggle('saved');
            if (btn.classList.contains('saved')) {
                icon.classList.remove('bi-bookmark');
                icon.classList.add('bi-bookmark-fill');
                btn.style.color = '#2196f3';
                savePost(postId);
            } else {
                icon.classList.remove('bi-bookmark-fill');
                icon.classList.add('bi-bookmark');
                btn.style.color = '';
                unsavePost(postId);
            }
        };
    });
    // Comment system
    container.querySelectorAll('.comment-form').forEach(function (form) {
        console.log('Attaching comment-form handler to', form);
        form.onsubmit = function (e) {
            e.preventDefault();
            const postId = form.dataset.postId;
            const user = form.querySelector('input[name="user"]').value || 'You';
            const text = form.querySelector('input[name="text"]').value;
            if (!text.trim()) return;
            console.log('Submitting comment for post', postId, 'text:', text);
            fetch('/comment', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: `post_id=${postId}&user=${encodeURIComponent(user)}&text=${encodeURIComponent(text)}`
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    renderComments(postId, data.comments);
                    // Update the post.comments in window.allPosts so modal shows new comment immediately
                    if (window.allPosts) {
                        const p = window.allPosts.find(p => p.id.toString() === postId);
                        if (p) p.comments = data.comments;
                    }
                    form.reset();
                }
            });
        };
    });
    // Share button
    attachShareHandlers(container);
}

function renderComments(postId, comments) {
    // Update all .comments-list for this postId
    document.querySelectorAll('.comments-list[data-post-id="' + postId + '"]').forEach(function(list) {
        list.innerHTML = comments.map(c => `<div class=\"mb-1\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('');
    });
    // Update comment count in all .comment-btn for this postId
    document.querySelectorAll('.comment-btn[data-post-id="' + postId + '"]').forEach(function(btn) {
        // Find the icon and update the count after it
        const icon = btn.querySelector('i');
        if (icon && icon.nextSibling) {
            icon.nextSibling.nodeValue = ' ' + comments.length;
        }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // At the top of the DOMContentLoaded handler, declare these only once:
    const feedPostsList = document.getElementById('feed-posts-list');
    const myTripsPostsList = document.getElementById('my-trips-posts-list');
    const groupsPostsList = document.getElementById('groups-posts-list');
    const savedPostsList = document.getElementById('saved-posts-list');

    attachPostInteractivity(document);
    // Travel Groups post grid rendering
    if (groupsPostsList && window.allPosts) {
        console.log('Travel Groups: window.allPosts =', window.allPosts);
        // Pick 7-8 random posts from allPosts
        const shuffled = window.allPosts.slice().sort(() => 0.5 - Math.random());
        const randomPosts = shuffled.slice(0, 8);
        window.randomPosts = randomPosts; // Make available for modal logic
        console.log('Travel Groups: rendering randomPosts =', randomPosts);
        groupsPostsList.innerHTML = randomPosts.map(post => `
            <div class="col-lg-4 col-md-6">
                <div class="card saved-post-card mb-4 shadow-sm post-card" data-post-id="${post.id}" style="border-radius:18px;cursor:pointer;">
                    <div class="card-body p-3 pb-2">
                        <div class="d-flex align-items-center mb-2">
                            <img src="${post.avatar || ''}" class="rounded-circle me-2" style="width:40px;height:40px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-semibold">${post.user || ''}</span><br>
                                <span class="text-muted small">@${(post.user || '').toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image || ''}" class="w-100 rounded-3 mb-2" style="height:180px;object-fit:cover;">
                        <div class="fw-semibold mb-1">${post.content ? post.content.substring(0, 40) : ''}...</div>
                        <div class="mb-2 text-muted" style="font-size:0.97rem;">${post.content ? post.content.substring(0, 60) : ''}...</div>
                        <div class="mb-2 d-flex align-items-center text-muted" style="font-size:0.97rem;"><i class="bi bi-geo-alt me-1"></i> ${post.location || ''}</div>
                        <div class="mb-2">
                            ${(post.hashtags || []).map(tag => `<span class=\"badge bg-light text-primary me-1\" style=\"font-size:0.95rem;\">${tag}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Travel Groups modal logic
    const mainContent = document.getElementById('main-content-area');
    const postModal = document.getElementById('post-modal');
    const postModalBody = document.getElementById('post-modal-body');
    const closeModalBtn = document.getElementById('close-post-modal');
    if (groupsPostsList && postModal && postModalBody && closeModalBtn && mainContent) {
        groupsPostsList.addEventListener('click', function(e) {
            const card = e.target.closest('.post-card');
            if (!card) return;
            const postId = card.getAttribute('data-post-id').toString();
            // Find the post data from the global allPosts if available
            let allPosts = window.allPosts || [];
            if (!allPosts.length && window.randomPosts) allPosts = window.randomPosts;
            if (!allPosts.length) return;
            const post = allPosts.find(p => p.id.toString() === postId);
            if (!post) return;
            postModalBody.innerHTML = `
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-2">
                        <img src="${post.avatar}" class="rounded-circle me-2" style="width:44px;height:44px;object-fit:cover;">
                        <div class="flex-grow-1">
                            <span class="fw-semibold" style="font-size:1.1rem;">${post.user}</span><br>
                            <span class="text-muted small">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                        </div>
                    </div>
                    <img src="${post.image}" class="w-100 rounded-3 mb-3" style="height:240px;object-fit:cover;">
                    <div class="fw-semibold mb-2" style="font-size:1.08rem;">${post.content}</div>
                    <div class="mb-2 text-muted" style="font-size:0.97rem;">${post.location}</div>
                    <div class="mb-2">
                        ${post.hashtags.map(tag => `<span class="badge bg-light text-primary me-1" style="font-size:0.95rem;">${tag}</span>`).join('')}
                    </div>
                    <div class="feed-actions d-flex align-items-center mb-2" style="font-size:1.1rem;">
                        <span class="me-3 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                        <span class="me-3 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                        <span class="me-3 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                        <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                    </div>
                    <div class="border-top pt-2">
                        <div class="fw-bold small mb-1">Comments</div>
                        <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-1\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                        <form class="comment-form mt-2 d-flex" data-post-id="${post.id}">
                            <input type="hidden" name="user" value="You">
                            <input type="text" name="text" class="form-control form-control-sm me-2" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                            <button class="btn btn-sm btn-primary" type="submit">Post</button>
                        </form>
                    </div>
                </div>
            `;
            postModal.classList.remove('d-none');
            // mainContent.classList.add('blurred-bg'); // Remove modal blur effect for all
            setTimeout(() => {
                attachPostInteractivity(postModalBody);
            }, 10);
        });
        closeModalBtn.addEventListener('click', function() {
            postModal.classList.add('d-none');
            // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
            postModalBody.innerHTML = '';
        });
        postModal.addEventListener('click', function(e) {
            if (e.target === postModal) {
                postModal.classList.add('d-none');
                // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
                postModalBody.innerHTML = '';
            }
        });
    }

    // Notification bell (dropdown)
    const bell = document.querySelector('.bi-bell');
    if (bell) {
        bell.addEventListener('click', function (e) {
            e.stopPropagation();
            let dropdown = document.getElementById('notif-dropdown');
            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.id = 'notif-dropdown';
                dropdown.style.position = 'absolute';
                dropdown.style.top = '56px';
                dropdown.style.right = '32px';
                dropdown.style.width = '320px';
                dropdown.style.background = '#fff';
                dropdown.style.boxShadow = '0 4px 24px rgba(0,0,0,0.07),0 1.5px 4px rgba(0,0,0,0.03)';
                dropdown.style.borderRadius = '14px';
                dropdown.style.zIndex = 9999;
                dropdown.innerHTML = `
                    <div class="p-3 border-bottom fw-semibold">Notifications</div>
                    <div class="p-3">
                        <div class="mb-2"><span class="fw-bold">Sarah Chen</span> liked your post <span class="text-muted small">2m ago</span></div>
                        <div class="mb-2"><span class="fw-bold">Mike Wilson</span> commented: <span class="fst-italic">Amazing photo!</span> <span class="text-muted small">10m ago</span></div>
                        <div><span class="fw-bold">travel_lisa</span> started following you <span class="text-muted small">1h ago</span></div>
                    </div>
                `;
                document.body.appendChild(dropdown);
                document.addEventListener('click', hideDropdown);
            } else {
                dropdown.remove();
                document.removeEventListener('click', hideDropdown);
            }
            function hideDropdown() {
                dropdown.remove();
                document.removeEventListener('click', hideDropdown);
            }
        });
    }

    // Simple modal for comments/share
    function showModal(title, content) {
        let modal = document.getElementById('site-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'site-modal';
            modal.innerHTML = `
                <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:99999;display:flex;align-items:center;justify-content:center;">
                    <div style="background:#fff;border-radius:14px;min-width:320px;max-width:90vw;padding:2rem;box-shadow:0 4px 24px rgba(0,0,0,0.07);position:relative;">
                        <button id="close-modal" style="position:absolute;top:10px;right:10px;border:none;background:none;font-size:1.5rem;">&times;</button>
                        <div class="fw-bold mb-2" style="font-size:1.1rem;">${title}</div>
                        <div>${content}</div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('close-modal').onclick = function () {
                modal.remove();
            };
        }
    }
    window.showModal = showModal;

    // --- Saved Posts helpers ---
    // These are now global functions, so they are no longer needed here.
    // window.getSavedPosts = function() {
    //     return JSON.parse(localStorage.getItem('saved_posts') || '[]');
    // };
    // window.savePost = function(postId) {
    //     postId = postId.toString();
    //     let saved = window.getSavedPosts();
    //     if (!saved.includes(postId)) {
    //         saved.push(postId);
    //         localStorage.setItem('saved_posts', JSON.stringify(saved));
    //     }
    // };
    // window.unsavePost = function(postId) {
    //     postId = postId.toString();
    //     let saved = window.getSavedPosts();
    //     saved = saved.filter(id => id !== postId);
    //     localStorage.setItem('saved_posts', JSON.stringify(saved));
    // };
    // window.isPostSaved = function(postId) {
    //     postId = postId.toString();
    //     return window.getSavedPosts().includes(postId);
    // };
    // --- Like helpers ---
    // These are now global functions, so they are no longer needed here.
    // window.getLikedPosts = function() {
    //     return JSON.parse(localStorage.getItem('liked_posts') || '[]');
    // };
    // window.likePost = function(postId) {
    //     postId = postId.toString();
    //     let liked = window.getLikedPosts();
    //     if (!liked.includes(postId)) {
    //         liked.push(postId);
    //         localStorage.setItem('liked_posts', JSON.stringify(liked));
    //     }
    // };
    // window.unlikePost = function(postId) {
    //     postId = postId.toString();
    //     let liked = window.getLikedPosts();
    //     liked = liked.filter(id => id !== postId);
    //     localStorage.setItem('liked_posts', JSON.stringify(liked));
    // };
    // window.isPostLiked = function(postId) {
    //     postId = postId.toString();
    //     return window.getLikedPosts().includes(postId);
    // };

    // --- Unified post rendering for all sections ---
    window.renderFeedPostHtml = function(post) {
        const isUserPost = post.user === 'You';
        let deleteBtnHtml = '';
        if (isUserPost) {
            deleteBtnHtml = `<button class="btn btn-danger btn-sm delete-post-btn" data-post-id="${post.id}" style="position:absolute;top:18px;right:18px;z-index:2;"><i class="bi bi-trash"></i> Delete</button>`;
        }
        if (post.type === 'guide') {
            return `<div class="col-12 mb-4">
                <div class="card post-card shadow-sm position-relative" data-post-id="${post.id}" style="border-radius:28px;max-width:540px;min-width:340px;width:100%;margin:auto;cursor:pointer;background:#fff;box-shadow:0 4px 24px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);">
                    ${deleteBtnHtml}
                    <div class="card-body p-5 pb-4">
                        <div class="d-flex align-items-center mb-3">
                            <img src="${post.avatar}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-bold" style="font-size:1.18rem;">${post.user}</span><br>
                                <span class="text-muted small" style="font-size:1.05rem;">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image}" class="w-100 rounded-4 mb-3 post-image" style="height:260px;object-fit:cover;cursor:pointer;">
                        <div class="fw-semibold mb-2" style="font-size:1.18rem;">${post.guide_title || 'Guide'}</div>
                        <ol class="mb-3">${(post.guide_steps||[]).map((step,i)=>`<li style='font-size:1.07rem;'>${step}</li>`).join('')}</ol>
                        <div class="feed-actions d-flex align-items-center mb-3" style="font-size:1.18rem;">
                            <span class="me-4 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                            <span class="me-4 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                            <span class="me-4 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                            <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                        </div>
                        <div class="border-top pt-3">
                            <div class="fw-bold small mb-2">Comments</div>
                            <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-2\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                            <form class="comment-form mt-3 d-flex" data-post-id="${post.id}">
                                <input type="hidden" name="user" value="You">
                                <input type="text" name="text" class="form-control form-control-lg me-3" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                <button class="btn btn-lg btn-primary" type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
        } else if (post.type === 'story') {
            return `<div class="col-12 mb-4">
                <div class="card post-card shadow-sm position-relative" data-post-id="${post.id}" style="border-radius:28px;max-width:540px;min-width:340px;width:100%;margin:auto;cursor:pointer;background:#fff;box-shadow:0 4px 24px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);">
                    ${deleteBtnHtml}
                    <div class="card-body p-5 pb-4">
                        <div class="d-flex align-items-center mb-3">
                            <img src="${post.avatar}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-bold" style="font-size:1.18rem;">${post.user}</span><br>
                                <span class="text-muted small" style="font-size:1.05rem;">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image}" class="w-100 rounded-4 mb-3 post-image" style="height:260px;object-fit:cover;cursor:pointer;">
                        <div class="fw-semibold mb-2" style="font-size:1.18rem;">Travel Story</div>
                        <div class="mb-3 text-muted" style="font-size:1.07rem;white-space:pre-line;">${post.story_content || ''}</div>
                        <div class="feed-actions d-flex align-items-center mb-3" style="font-size:1.18rem;">
                            <span class="me-4 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                            <span class="me-4 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                            <span class="me-4 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                            <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                        </div>
                        <div class="border-top pt-3">
                            <div class="fw-bold small mb-2">Comments</div>
                            <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-2\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                            <form class="comment-form mt-3 d-flex" data-post-id="${post.id}">
                                <input type="hidden" name="user" value="You">
                                <input type="text" name="text" class="form-control form-control-lg me-3" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                <button class="btn btn-lg btn-primary" type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
        } else {
            // Default: normal post
            return `<div class="col-12 mb-4">
                <div class="card post-card shadow-sm position-relative" data-post-id="${post.id}" style="border-radius:28px;max-width:540px;min-width:340px;width:100%;margin:auto;cursor:pointer;background:#fff;box-shadow:0 4px 24px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);">
                    ${deleteBtnHtml}
                    <div class="card-body p-5 pb-4">
                        <div class="d-flex align-items-center mb-3">
                            <img src="${post.avatar}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-bold" style="font-size:1.18rem;">${post.user}</span><br>
                                <span class="text-muted small" style="font-size:1.05rem;">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image}" class="w-100 rounded-4 mb-3 post-image" style="height:260px;object-fit:cover;cursor:pointer;">
                        <div class="fw-semibold mb-2" style="font-size:1.18rem;">${(post.content || '').substring(0, 60) + '…'}</div>
                        <div class="mb-3 text-muted" style="font-size:1.07rem;">${(post.content || '').substring(0, 120) + '…'}</div>
                        <div class="mb-3 d-flex align-items-center text-muted" style="font-size:1.07rem;"><i class="bi bi-geo-alt me-2"></i> ${post.location || ''}</div>
                        <div class="mb-3">
                            ${(post.hashtags||[]).map(tag => `<span class=\"badge bg-light text-primary me-2\" style=\"font-size:1.05rem;\">${tag}</span>`).join('')}
                        </div>
                        <div class="feed-actions d-flex align-items-center mb-3" style="font-size:1.18rem;">
                            <span class="me-4 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                            <span class="me-4 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                            <span class="me-4 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                            <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                        </div>
                        <div class="border-top pt-3">
                            <div class="fw-bold small mb-2">Comments</div>
                            <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-2\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                            <form class="comment-form mt-3 d-flex" data-post-id="${post.id}">
                                <input type="hidden" name="user" value="You">
                                <input type="text" name="text" class="form-control form-control-lg me-3" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                <button class="btn btn-lg btn-primary" type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>`;
        }
    };

    // My Trips page logic
    if (myTripsPostsList && window.myTripsPosts) {
        myTripsPostsList.innerHTML = window.myTripsPosts.map(window.renderFeedPostHtml).join('');
        attachPostInteractivity(myTripsPostsList);
    }

    // Travel Groups page logic
    if (groupsPostsList) {
        console.log('Travel Groups: groupsPostsList found');
        console.log('Travel Groups: window.allPosts =', window.allPosts);
        console.log('Travel Groups: window.randomPosts =', window.randomPosts);
        if (!window.randomPosts || !Array.isArray(window.randomPosts) || window.randomPosts.length === 0) {
            // If not set, use all posts (or random sample if you want)
            if (window.allPosts && Array.isArray(window.allPosts)) {
                // Pick 8 random posts if more than 8, else use all
                if (window.allPosts.length > 8) {
                    const shuffled = window.allPosts.slice().sort(() => 0.5 - Math.random());
                    window.randomPosts = shuffled.slice(0, 8);
                } else {
                    window.randomPosts = window.allPosts.slice();
                }
            } else {
                window.randomPosts = [];
            }
        }
        console.log('Travel Groups: rendering', window.randomPosts.length, 'posts');
        groupsPostsList.innerHTML = window.randomPosts.map(window.renderFeedPostHtml).join('');
        attachPostInteractivity(groupsPostsList);
    }

    // Saved Posts page logic
    if (savedPostsList && window.allPosts) {
        const savedIds = window.getSavedPosts();
        const savedPosts = window.allPosts.filter(p => savedIds.includes(p.id.toString()));
        window.savedPosts = savedPosts;
        if (savedPosts.length === 0) {
            savedPostsList.innerHTML = '<div class="text-center text-muted py-5">No saved posts yet.</div>';
        } else {
            savedPostsList.innerHTML = savedPosts.map(window.renderFeedPostHtml).join('');
        }
        attachPostInteractivity(savedPostsList);
    }

    // Travel Groups modal logic (apply same fixes as Saved Posts)
    if (groupsPostsList && window.randomPosts) {
        const mainContent = document.getElementById('main-content-area');
        const postModal = document.getElementById('post-modal');
        const postModalBody = document.getElementById('post-modal-body');
        const closeModalBtn = document.getElementById('close-post-modal');
        groupsPostsList.addEventListener('click', function(e) {
            const card = e.target.closest('.post-card');
            if (!card) return;
            const postId = card.getAttribute('data-post-id').toString();
            const post = window.randomPosts.find(p => p.id.toString() === postId);
            if (!post) return;
            postModalBody.innerHTML = `
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-2">
                        <img src="${post.avatar}" class="rounded-circle me-2" style="width:44px;height:44px;object-fit:cover;">
                        <div class="flex-grow-1">
                            <span class="fw-semibold" style="font-size:1.1rem;">${post.user}</span><br>
                            <span class="text-muted small">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                        </div>
                    </div>
                    <img src="${post.image}" class="w-100 rounded-3 mb-3" style="height:240px;object-fit:cover;">
                    <div class="fw-semibold mb-2" style="font-size:1.08rem;">${post.content}</div>
                    <div class="mb-2 text-muted" style="font-size:0.97rem;">${post.location}</div>
                    <div class="mb-2">
                        ${post.hashtags.map(tag => `<span class="badge bg-light text-primary me-1" style="font-size:0.95rem;">${tag}</span>`).join('')}
                    </div>
                    <div class="feed-actions d-flex align-items-center mb-2" style="font-size:1.1rem;">
                        <span class="me-3 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                        <span class="me-3 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                        <span class="me-3 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                        <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                    </div>
                    <div class="border-top pt-2">
                        <div class="fw-bold small mb-1">Comments</div>
                        <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class="mb-1"><span class="fw-bold">${c.user}</span> ${c.text}</div>`).join('')}</div>
                        <form class="comment-form mt-2 d-flex" data-post-id="${post.id}">
                            <input type="hidden" name="user" value="You">
                            <input type="text" name="text" class="form-control form-control-sm me-2" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                            <button class="btn btn-sm btn-primary" type="submit">Post</button>
                        </form>
                    </div>
                </div>
            `;
            postModal.classList.remove('d-none');
            // mainContent.classList.add('blurred-bg'); // Remove modal blur effect for all
            setTimeout(() => {
                attachPostInteractivity(postModalBody);
                // Fix comment form to update UI immediately
                const form = postModalBody.querySelector('.comment-form');
                if (form) {
                    form.onsubmit = function(e) {
                        e.preventDefault();
                        const postId = form.dataset.postId;
                        const user = form.querySelector('input[name="user"]').value || 'You';
                        const text = form.querySelector('input[name="text"]').value;
                        if (!text.trim()) return;
                        fetch('/comment', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: `post_id=${postId}&user=${encodeURIComponent(user)}&text=${encodeURIComponent(text)}`
                        })
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                // Update comments in modal
                                const commentsList = postModalBody.querySelector('.comments-list');
                                if (commentsList) {
                                    commentsList.innerHTML = data.comments.map(c => `<div class="mb-1"><span class="fw-bold">${c.user}</span> ${c.text}</div>`).join('');
                                }
                                form.reset();
                            }
                        });
                    };
                }
                // Fix share button in modal
                const shareBtn = postModalBody.querySelector('.share-btn');
                if (shareBtn) {
                    shareBtn.onclick = function(e) {
                        e.preventDefault();
                        const postUrl = window.location.origin + '/#post-' + post.id;
                        showModal('Share Post', `
                            <div>Share this post via:</div>
                            <button class="btn btn-sm btn-outline-primary mt-2 copy-link-btn" data-link="${postUrl}">Copy Link</button>
                            <a class="btn btn-sm btn-outline-success mt-2" href="https://wa.me/?text=${encodeURIComponent(postUrl)}" target="_blank">WhatsApp</a>
                            <a class="btn btn-sm btn-outline-info mt-2" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}" target="_blank">Twitter</a>
                        `);
                        setTimeout(function () {
                            document.querySelectorAll('.copy-link-btn').forEach(function (copyBtn) {
                                copyBtn.addEventListener('click', function () {
                                    navigator.clipboard.writeText(copyBtn.dataset.link);
                                    copyBtn.textContent = 'Copied!';
                                });
                            });
                        }, 100);
                    };
                }
            }, 10);
        });
        closeModalBtn.addEventListener('click', function() {
            postModal.classList.add('d-none');
            // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
            postModalBody.innerHTML = '';
        });
        postModal.addEventListener('click', function(e) {
            if (e.target === postModal) {
                postModal.classList.add('d-none');
                // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
                postModalBody.innerHTML = '';
            }
        });
    }

    // Home Feed page logic
    if (feedPostsList && window.allPosts) {
        // Remove the Home Feed heading if present
        const mainContentArea = document.getElementById('main-content-area');
        if (mainContentArea) {
            const heading = mainContentArea.querySelector('h4.fw-semibold');
            if (heading) heading.remove();
        }
        feedPostsList.innerHTML = window.allPosts.map(post => {
            if (post.type === 'guide') {
                return `<div class="col-12 mb-4">
                    <div class="card post-card shadow-sm" data-post-id="${post.id}" style="border-radius:28px;max-width:540px;min-width:340px;width:100%;margin:auto;cursor:pointer;background:#fff;box-shadow:0 4px 24px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);">
                        <div class="card-body p-5 pb-4">
                            <div class="d-flex align-items-center mb-3">
                                <img src="${post.avatar}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                                <div class="flex-grow-1">
                                    <span class="fw-bold" style="font-size:1.18rem;">${post.user}</span><br>
                                    <span class="text-muted small" style="font-size:1.05rem;">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                                </div>
                            </div>
                            <img src="${post.image}" class="w-100 rounded-4 mb-3 post-image" style="height:260px;object-fit:cover;cursor:pointer;">
                            <div class="fw-semibold mb-2" style="font-size:1.18rem;">${post.guide_title || 'Guide'}</div>
                            <ol class="mb-3">${(post.guide_steps||[]).map((step,i)=>`<li style='font-size:1.07rem;'>${step}</li>`).join('')}</ol>
                            <div class="feed-actions d-flex align-items-center mb-3" style="font-size:1.18rem;">
                                <span class="me-4 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                                <span class="me-4 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                                <span class="me-4 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                                <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                            </div>
                            <div class="border-top pt-3">
                                <div class="fw-bold small mb-2">Comments</div>
                                <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-2\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                                <form class="comment-form mt-3 d-flex" data-post-id="${post.id}">
                                    <input type="hidden" name="user" value="You">
                                    <input type="text" name="text" class="form-control form-control-lg me-3" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                    <button class="btn btn-lg btn-primary" type="submit">Post</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>`;
            } else if (post.type === 'story') {
                return `<div class="col-12 mb-4">
                    <div class="card post-card shadow-sm" data-post-id="${post.id}" style="border-radius:28px;max-width:540px;min-width:340px;width:100%;margin:auto;cursor:pointer;background:#fff;box-shadow:0 4px 24px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);">
                        <div class="card-body p-5 pb-4">
                            <div class="d-flex align-items-center mb-3">
                                <img src="${post.avatar}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                                <div class="flex-grow-1">
                                    <span class="fw-bold" style="font-size:1.18rem;">${post.user}</span><br>
                                    <span class="text-muted small" style="font-size:1.05rem;">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                                </div>
                            </div>
                            <img src="${post.image}" class="w-100 rounded-4 mb-3 post-image" style="height:260px;object-fit:cover;cursor:pointer;">
                            <div class="fw-semibold mb-2" style="font-size:1.18rem;">Travel Story</div>
                            <div class="mb-3 text-muted" style="font-size:1.07rem;white-space:pre-line;">${post.story_content || ''}</div>
                            <div class="feed-actions d-flex align-items-center mb-3" style="font-size:1.18rem;">
                                <span class="me-4 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                                <span class="me-4 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                                <span class="me-4 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                                <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                            </div>
                            <div class="border-top pt-3">
                                <div class="fw-bold small mb-2">Comments</div>
                                <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-2\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                                <form class="comment-form mt-3 d-flex" data-post-id="${post.id}">
                                    <input type="hidden" name="user" value="You">
                                    <input type="text" name="text" class="form-control form-control-lg me-3" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                    <button class="btn btn-lg btn-primary" type="submit">Post</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>`;
            } else {
                // Default: normal post
                return `<div class="col-12 mb-4">
                    <div class="card post-card shadow-sm" data-post-id="${post.id}" style="border-radius:28px;max-width:540px;min-width:340px;width:100%;margin:auto;cursor:pointer;background:#fff;box-shadow:0 4px 24px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);">
                        <div class="card-body p-5 pb-4">
                            <div class="d-flex align-items-center mb-3">
                                <img src="${post.avatar}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                                <div class="flex-grow-1">
                                    <span class="fw-bold" style="font-size:1.18rem;">${post.user}</span><br>
                                    <span class="text-muted small" style="font-size:1.05rem;">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                                </div>
                            </div>
                            <img src="${post.image}" class="w-100 rounded-4 mb-3 post-image" style="height:260px;object-fit:cover;cursor:pointer;">
                            <div class="fw-semibold mb-2" style="font-size:1.18rem;">${(post.content || '').substring(0, 60) + '…'}</div>
                            <div class="mb-3 text-muted" style="font-size:1.07rem;">${(post.content || '').substring(0, 120) + '…'}</div>
                            <div class="mb-3 d-flex align-items-center text-muted" style="font-size:1.07rem;"><i class="bi bi-geo-alt me-2"></i> ${post.location || ''}</div>
                            <div class="mb-3">
                                ${(post.hashtags||[]).map(tag => `<span class=\"badge bg-light text-primary me-2\" style=\"font-size:1.05rem;\">${tag}</span>`).join('')}
                            </div>
                            <div class="feed-actions d-flex align-items-center mb-3" style="font-size:1.18rem;">
                                <span class="me-4 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                                <span class="me-4 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                                <span class="me-4 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                                <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                            </div>
                            <div class="border-top pt-3">
                                <div class="fw-bold small mb-2">Comments</div>
                                <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class=\"mb-2\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                                <form class="comment-form mt-3 d-flex" data-post-id="${post.id}">
                                    <input type="hidden" name="user" value="You">
                                    <input type="text" name="text" class="form-control form-control-lg me-3" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                    <button class="btn btn-lg btn-primary" type="submit">Post</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        }).join('');
        // Attach interactivity to the newly rendered feed cards
        attachPostInteractivity(feedPostsList);
    }
    // Home Feed modal logic
    if (feedPostsList && window.allPosts) {
        const mainContent = document.getElementById('main-content-area');
        const postModal = document.getElementById('post-modal');
        const postModalBody = document.getElementById('post-modal-body');
        const closeModalBtn = document.getElementById('close-post-modal');
        feedPostsList.addEventListener('click', function(e) {
            // Prevent modal open if clicking on interactive elements
            if (
                e.target.closest('.like-btn') ||
                e.target.closest('.comment-btn') ||
                e.target.closest('.share-btn') ||
                e.target.closest('.save-btn') ||
                e.target.closest('.comment-form') ||
                e.target.tagName === 'BUTTON' ||
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'A'
            ) {
                return;
            }
            // Only open modal if clicking on card background or post image
            const card = e.target.closest('.post-card');
            if (!card) return;
            if (!e.target.classList.contains('post-card') && !e.target.classList.contains('post-image')) return;
            const postId = card.getAttribute('data-post-id').toString();
            const post = window.allPosts.find(p => p.id.toString() === postId);
            if (!post) return;
            postModalBody.innerHTML = `
                <div class="card-body p-4">
                    <div class="d-flex align-items-center mb-2">
                        <img src="${post.avatar}" class="rounded-circle me-2" style="width:44px;height:44px;object-fit:cover;">
                        <div class="flex-grow-1">
                            <span class="fw-semibold" style="font-size:1.1rem;">${post.user}</span><br>
                            <span class="text-muted small">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                        </div>
                    </div>
                    <img src="${post.image}" class="w-100 rounded-3 mb-3" style="height:240px;object-fit:cover;">
                    <div class="fw-semibold mb-2" style="font-size:1.08rem;">${post.content}</div>
                    <div class="mb-2 text-muted" style="font-size:0.97rem;">${post.location}</div>
                    <div class="mb-2">
                        ${post.hashtags.map(tag => `<span class="badge bg-light text-primary me-1" style="font-size:0.95rem;">${tag}</span>`).join('')}
                    </div>
                    <div class="feed-actions d-flex align-items-center mb-2" style="font-size:1.1rem;">
                        <span class="me-3 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                        <span class="me-3 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments.length}</span>
                        <span class="me-3 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                        <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                    </div>
                    <div class="border-top pt-2">
                        <div class="fw-bold small mb-1">Comments</div>
                        <div class="comments-list" data-post-id="${post.id}">${post.comments.map(c => `<div class="mb-1"><span class="fw-bold">${c.user}</span> ${c.text}</div>`).join('')}</div>
                        <form class="comment-form mt-2 d-flex" data-post-id="${post.id}">
                            <input type="hidden" name="user" value="You">
                            <input type="text" name="text" class="form-control form-control-sm me-2" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                            <button class="btn btn-sm btn-primary" type="submit">Post</button>
                        </form>
                    </div>
                </div>
            `;
            postModal.classList.remove('d-none');
            // mainContent.classList.add('blurred-bg'); // Remove modal blur effect for all
            setTimeout(() => {
                attachPostInteractivity(postModalBody);
                // Fix comment form to update UI immediately
                const form = postModalBody.querySelector('.comment-form');
                if (form) {
                    form.onsubmit = function(e) {
                        e.preventDefault();
                        const postId = form.dataset.postId;
                        const user = form.querySelector('input[name="user"]').value || 'You';
                        const text = form.querySelector('input[name="text"]').value;
                        if (!text.trim()) return;
                        fetch('/comment', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: `post_id=${postId}&user=${encodeURIComponent(user)}&text=${encodeURIComponent(text)}`
                        })
                        .then(r => r.json())
                        .then(data => {
                            if (data.success) {
                                // Update comments in modal
                                const commentsList = postModalBody.querySelector('.comments-list');
                                if (commentsList) {
                                    commentsList.innerHTML = data.comments.map(c => `<div class="mb-1"><span class="fw-bold">${c.user}</span> ${c.text}</div>`).join('');
                                }
                                form.reset();
                            }
                        });
                    };
                }
                // Fix share button in modal
                const shareBtn = postModalBody.querySelector('.share-btn');
                if (shareBtn) {
                    shareBtn.onclick = function(e) {
                        e.preventDefault();
                        const postUrl = window.location.origin + '/#post-' + post.id;
                        showModal('Share Post', `
                            <div>Share this post via:</div>
                            <button class="btn btn-sm btn-outline-primary mt-2 copy-link-btn" data-link="${postUrl}">Copy Link</button>
                            <a class="btn btn-sm btn-outline-success mt-2" href="https://wa.me/?text=${encodeURIComponent(postUrl)}" target="_blank">WhatsApp</a>
                            <a class="btn btn-sm btn-outline-info mt-2" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}" target="_blank">Twitter</a>
                        `);
                        setTimeout(function () {
                            document.querySelectorAll('.copy-link-btn').forEach(function (copyBtn) {
                                copyBtn.addEventListener('click', function () {
                                    navigator.clipboard.writeText(copyBtn.dataset.link);
                                    copyBtn.textContent = 'Copied!';
                                });
                            });
                        }, 100);
                    };
                }
            }, 10);
        });
        closeModalBtn.addEventListener('click', function() {
            postModal.classList.add('d-none');
            // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
            postModalBody.innerHTML = '';
        });
        postModal.addEventListener('click', function(e) {
            if (e.target === postModal) {
                postModal.classList.add('d-none');
                // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
                postModalBody.innerHTML = '';
            }
        });
    }

    // Create Post form AJAX handler
    const createPostForm = document.getElementById('create-post-form');
    const imageFileInput = document.getElementById('image-file-input');
    const selectGalleryBtn = document.getElementById('select-gallery-btn');
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const imagePreview = document.getElementById('image-preview');
    const imageDataField = document.getElementById('image-data-field');

    if (selectGalleryBtn && imageFileInput) {
        selectGalleryBtn.addEventListener('click', function() {
            imageFileInput.accept = 'image/*';
            imageFileInput.capture = '';
            imageFileInput.click();
        });
    }
    if (takePhotoBtn && imageFileInput) {
        takePhotoBtn.addEventListener('click', function() {
            imageFileInput.accept = 'image/*';
            imageFileInput.capture = 'environment';
            imageFileInput.click();
        });
    }
    if (imageFileInput && imagePreview && imageDataField) {
        imageFileInput.addEventListener('change', function() {
            const file = imageFileInput.files[0];
            if (!file) return;
            imagePreview.style.display = 'none';
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Resize/compress image using canvas
                    const img = new window.Image();
                    img.onload = function() {
                        const maxDim = 1024;
                        let w = img.width;
                        let h = img.height;
                        if (w > h && w > maxDim) {
                            h = Math.round(h * maxDim / w);
                            w = maxDim;
                        } else if (h > w && h > maxDim) {
                            w = Math.round(w * maxDim / h);
                            h = maxDim;
                        } else if (w > maxDim) {
                            w = h = maxDim;
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        // Compress to JPEG, quality 0.7
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        imagePreview.src = dataUrl;
                        imagePreview.style.display = 'block';
                        imageDataField.value = dataUrl;
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    if (createPostForm) {
        // Add or update error display element
        let errorDiv = document.getElementById('create-post-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'create-post-error';
            errorDiv.style.color = 'red';
            errorDiv.style.marginBottom = '1rem';
            createPostForm.prepend(errorDiv);
        }
        createPostForm.addEventListener('submit', function(e) {
            e.preventDefault();
            errorDiv.textContent = '';
            // Image size validation (10MB)
            if (imageFileInput && imageFileInput.files && imageFileInput.files[0]) {
                const file = imageFileInput.files[0];
                if (file.size > 10 * 1024 * 1024) {
                    errorDiv.textContent = 'Image is too large (max 10MB). Please select a smaller image.';
                    return;
                }
            }
            if (imageDataField && !imageDataField.value) {
                errorDiv.textContent = 'Please select or take a photo.';
                return;
            }
            const formData = new FormData(createPostForm);
            fetch('/create_post', {
                method: 'POST',
                body: formData
            })
            .then(async r => {
                let data;
                try { data = await r.json(); } catch { data = {}; }
                if (data.success) {
                    errorDiv.style.color = 'green';
                    errorDiv.textContent = 'Post created successfully! Redirecting...';
                    setTimeout(() => { window.location.href = '/'; }, 1200);
                } else {
                    errorDiv.style.color = 'red';
                    errorDiv.textContent = data.error || 'Failed to create post.';
                }
            })
            .catch(() => {
                errorDiv.style.color = 'red';
                errorDiv.textContent = 'Failed to create post.';
            });
        });
    }

    // Delete post handler for My Trips
    document.querySelectorAll('.delete-post-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const postId = btn.getAttribute('data-post-id');
            if (!confirm('Are you sure you want to delete this post?')) return;
            fetch('/delete_post', {
                method: 'POST',
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                body: 'post_id=' + encodeURIComponent(postId)
            })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    // Remove only the deleted card from the DOM (Option 2)
                    const card = btn.closest('.post-card');
                    if (card) card.remove();
                } else {
                    alert('Failed to delete post.');
                }
            })
            .catch(() => alert('Failed to delete post.'));
        });
    });

    // --- Create Post Tabs Logic ---
    const tabPost = document.getElementById('tab-post');
    const tabStory = document.getElementById('tab-story');
    const tabGuide = document.getElementById('tab-guide');
    const postFields = document.getElementById('post-fields');
    const storyFields = document.getElementById('story-fields');
    const guideFields = document.getElementById('guide-fields');
    const postTypeField = document.getElementById('post-type-field');
    if (tabPost && tabStory && tabGuide && postFields && storyFields && guideFields && postTypeField) {
        function setTab(type) {
            tabPost.classList.remove('active');
            tabStory.classList.remove('active');
            tabGuide.classList.remove('active');
            tabPost.classList.add('text-muted');
            tabStory.classList.add('text-muted');
            tabGuide.classList.add('text-muted');
            postFields.style.display = 'none';
            storyFields.style.display = 'none';
            guideFields.style.display = 'none';
            if (type === 'post') {
                tabPost.classList.add('active');
                tabPost.classList.remove('text-muted');
                postFields.style.display = '';
            } else if (type === 'story') {
                tabStory.classList.add('active');
                tabStory.classList.remove('text-muted');
                storyFields.style.display = '';
            } else if (type === 'guide') {
                tabGuide.classList.add('active');
                tabGuide.classList.remove('text-muted');
                guideFields.style.display = '';
            }
            postTypeField.value = type;
        }
        tabPost.onclick = function(e) { e.preventDefault(); setTab('post'); };
        tabStory.onclick = function(e) { e.preventDefault(); setTab('story'); };
        tabGuide.onclick = function(e) { e.preventDefault(); setTab('guide'); };
        // Default to Post
        setTab('post');
    }
    // --- Guide Steps Logic ---
    const addGuideStepBtn = document.getElementById('add-guide-step');
    const guideStepsList = document.getElementById('guide-steps-list');
    if (addGuideStepBtn && guideStepsList) {
        addGuideStepBtn.onclick = function() {
            const stepCount = guideStepsList.querySelectorAll('.guide-step-row').length + 1;
            const div = document.createElement('div');
            div.className = 'mb-3 guide-step-row';
            div.innerHTML = `<input type="text" class="form-control rounded-3 mb-2" name="guide_steps[]" placeholder="Step ${stepCount}" style="font-size:1.01rem;background:#f8fafc;"> <button type="button" class="btn btn-sm btn-danger remove-guide-step">Remove</button>`;
            guideStepsList.appendChild(div);
            div.querySelector('.remove-guide-step').onclick = function() { div.remove(); };
        };
        // Remove step
        guideStepsList.querySelectorAll('.remove-guide-step').forEach(btn => {
            btn.onclick = function() { btn.closest('.guide-step-row').remove(); };
        });
    }

    // Attach modal logic to Travel Groups post cards (server-rendered)
    const groupsPostsListTG = document.querySelector('#main-content-area .row.gx-4.gy-4');
    const postModalTG = document.getElementById('post-modal');
    const postModalBodyTG = document.getElementById('post-modal-body');
    const closeModalBtnTG = document.getElementById('close-post-modal');
    if (groupsPostsListTG && postModalTG && postModalBodyTG && closeModalBtnTG) {
        groupsPostsListTG.addEventListener('click', function(e) {
            const card = e.target.closest('.post-card');
            if (!card) return;
            const postId = card.getAttribute('data-post-id').toString();
            let allPosts = window.allPosts || [];
            if (!allPosts.length) return;
            const post = allPosts.find(p => p.id.toString() === postId);
            if (!post) return;
            let modalContent = '';
            if (post.type === 'guide') {
                modalContent = `
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-2">
                            <img src="${post.avatar}" class="rounded-circle me-2" style="width:44px;height:44px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-semibold" style="font-size:1.1rem;">${post.user}</span><br>
                                <span class="text-muted small">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image}" class="w-100 rounded-3 mb-3" style="height:240px;object-fit:cover;">
                        <div class="fw-semibold mb-2" style="font-size:1.08rem;">${post.guide_title}</div>
                        <div class="mb-2 text-muted" style="font-size:0.97rem;">Guide Steps:</div>
                        <ol>${(post.guide_steps||[]).map(step => `<li>${step}</li>`).join('')}</ol>
                        <div class="mb-2 d-flex align-items-center text-muted" style="font-size:0.97rem;"><i class="bi bi-geo-alt me-1"></i> ${post.location||''}</div>
                        <div class="mb-2">${(post.hashtags||[]).map(tag => `<span class='badge bg-light text-primary me-1' style='font-size:0.95rem;'>${tag}</span>`).join('')}</div>
                        <div class="feed-actions d-flex align-items-center mb-2" style="font-size:1.1rem;">
                            <span class="me-3 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                            <span class="me-3 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments ? post.comments.length : 0}</span>
                            <span class="me-3 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                            <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                        </div>
                        <div class="border-top pt-2">
                            <div class="fw-bold small mb-1">Comments</div>
                            <div class="comments-list" data-post-id="${post.id}">${(post.comments||[]).map(c => `<div class=\"mb-1\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                            <form class="comment-form mt-2 d-flex" data-post-id="${post.id}">
                                <input type="hidden" name="user" value="You">
                                <input type="text" name="text" class="form-control form-control-sm me-2" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                <button class="btn btn-sm btn-primary" type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                `;
            } else if (post.type === 'story') {
                modalContent = `
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-2">
                            <img src="${post.avatar}" class="rounded-circle me-2" style="width:44px;height:44px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-semibold" style="font-size:1.1rem;">${post.user}</span><br>
                                <span class="text-muted small">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image}" class="w-100 rounded-3 mb-3" style="height:240px;object-fit:cover;">
                        <div class="fw-semibold mb-2" style="font-size:1.08rem;">${post.story_content}</div>
                        <div class="mb-2 d-flex align-items-center text-muted" style="font-size:0.97rem;"><i class="bi bi-geo-alt me-1"></i> ${post.location||''}</div>
                        <div class="mb-2">${(post.hashtags||[]).map(tag => `<span class='badge bg-light text-primary me-1' style='font-size:0.95rem;'>${tag}</span>`).join('')}</div>
                        <div class="feed-actions d-flex align-items-center mb-2" style="font-size:1.1rem;">
                            <span class="me-3 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                            <span class="me-3 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments ? post.comments.length : 0}</span>
                            <span class="me-3 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                            <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                        </div>
                        <div class="border-top pt-2">
                            <div class="fw-bold small mb-1">Comments</div>
                            <div class="comments-list" data-post-id="${post.id}">${(post.comments||[]).map(c => `<div class=\"mb-1\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                            <form class="comment-form mt-2 d-flex" data-post-id="${post.id}">
                                <input type="hidden" name="user" value="You">
                                <input type="text" name="text" class="form-control form-control-sm me-2" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                <button class="btn btn-sm btn-primary" type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                `;
            } else {
                modalContent = `
                    <div class="card-body p-4">
                        <div class="d-flex align-items-center mb-2">
                            <img src="${post.avatar}" class="rounded-circle me-2" style="width:44px;height:44px;object-fit:cover;">
                            <div class="flex-grow-1">
                                <span class="fw-semibold" style="font-size:1.1rem;">${post.user}</span><br>
                                <span class="text-muted small">@${post.user.toLowerCase().replace(/\s+/g, '_')}</span>
                            </div>
                        </div>
                        <img src="${post.image}" class="w-100 rounded-3 mb-3" style="height:240px;object-fit:cover;">
                        <div class="fw-semibold mb-2" style="font-size:1.08rem;">${post.content}</div>
                        <div class="mb-2 d-flex align-items-center text-muted" style="font-size:0.97rem;"><i class="bi bi-geo-alt me-1"></i> ${post.location||''}</div>
                        <div class="mb-2">${(post.hashtags||[]).map(tag => `<span class='badge bg-light text-primary me-1' style='font-size:0.95rem;'>${tag}</span>`).join('')}</div>
                        <div class="feed-actions d-flex align-items-center mb-2" style="font-size:1.1rem;">
                            <span class="me-3 like-btn" data-post-id="${post.id}"><i class="bi bi-heart"></i> ${post.likes.toLocaleString()}</span>
                            <span class="me-3 comment-btn" data-post-id="${post.id}"><i class="bi bi-chat"></i> ${post.comments ? post.comments.length : 0}</span>
                            <span class="me-3 share-btn" data-post-id="${post.id}"><i class="bi bi-share"></i></span>
                            <span class="save-btn" data-post-id="${post.id}"><i class="bi bi-bookmark"></i></span>
                        </div>
                        <div class="border-top pt-2">
                            <div class="fw-bold small mb-1">Comments</div>
                            <div class="comments-list" data-post-id="${post.id}">${(post.comments||[]).map(c => `<div class=\"mb-1\"><span class=\"fw-bold\">${c.user}</span> ${c.text}</div>`).join('')}</div>
                            <form class="comment-form mt-2 d-flex" data-post-id="${post.id}">
                                <input type="hidden" name="user" value="You">
                                <input type="text" name="text" class="form-control form-control-sm me-2" placeholder="Add a comment..." autocomplete="off" style="max-width:70%;">
                                <button class="btn btn-sm btn-primary" type="submit">Post</button>
                            </form>
                        </div>
                    </div>
                `;
            }
            postModalBodyTG.innerHTML = modalContent;
            postModalTG.classList.remove('d-none');
            // mainContent.classList.add('blurred-bg'); // Remove modal blur effect for all
            setTimeout(() => {
                attachPostInteractivity(postModalBodyTG);
            }, 10);
        });
        closeModalBtnTG.addEventListener('click', function() {
            postModalTG.classList.add('d-none');
            // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
            postModalBodyTG.innerHTML = '';
        });
        postModalTG.addEventListener('click', function(e) {
            if (e.target === postModalTG) {
                postModalTG.classList.add('d-none');
                // mainContent.classList.remove('blurred-bg'); // Remove modal blur effect for all
                postModalBodyTG.innerHTML = '';
            }
        });
    }

    // Live search functionality for all search bars
    document.querySelectorAll('input[type="search"]').forEach(function(searchInput) {
        let lastQuery = '';
        let modal = null;
        function showResults(query, results, posts) {
            if (!modal) {
                modal = document.getElementById('site-modal');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.id = 'site-modal';
                    document.body.appendChild(modal);
                }
            }
            modal.innerHTML = `
                <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;">
                    <div style="background:#fff;border-radius:22px;min-width:320px;max-width:700px;width:95vw;padding:2.5rem 2rem 2rem 2rem;box-shadow:0 8px 32px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);position:relative;max-height:90vh;overflow-y:auto;">
                        <button id="close-modal" style="position:absolute;top:18px;right:18px;border:none;background:#f5f7fa;border-radius:50%;width:38px;height:38px;font-size:1.7rem;line-height:1.2;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(33,150,243,0.08);transition:background 0.18s;">&times;</button>
                        <div class="fw-bold mb-3" style="font-size:1.18rem;letter-spacing:0.01em;">Search Results for "${query}" <span class='text-primary'>(${results.length})</span></div>
                        <div class="row gx-4 gy-4">
                            ${results.length === 0 ? `<div class='text-muted text-center' style='font-size:1.08rem;'>No results found.</div>` : results.map(post => `
                                <div class='col-lg-4 col-md-6'>
                                    <div class='card saved-post-card mb-4 shadow-sm post-card' data-post-id='${post.id}' style='border-radius:18px;cursor:pointer;'>
                                        <div class='card-body p-3 pb-2'>
                                            <div class='d-flex align-items-center mb-2'>
                                                <img src='${post.avatar || ''}' class='rounded-circle me-2' style='width:40px;height:40px;object-fit:cover;'>
                                                <div class='flex-grow-1'>
                                                    <span class='fw-semibold'>${post.user || ''}</span><br>
                                                    <span class='text-muted small'>@${(post.user || '').toLowerCase().replace(/\s+/g, '_')}</span>
                                                </div>
                                            </div>
                                            <img src='${post.image || ''}' class='w-100 rounded-3 mb-2' style='height:180px;object-fit:cover;'>
                                            ${post.type === 'guide' ? `
                                                <div class='fw-semibold mb-1'>${post.guide_title ? post.guide_title.substring(0,40) : ''}...</div>
                                                <div class='mb-2 text-muted' style='font-size:0.97rem;'>${post.guide_steps && post.guide_steps.length ? post.guide_steps[0].substring(0,60) : ''}...${post.guide_steps && post.guide_steps.length > 1 ? ` (+${post.guide_steps.length-1} steps)` : ''}</div>
                                            ` : post.type === 'story' ? `
                                                <div class='fw-semibold mb-1'>Story</div>
                                                <div class='mb-2 text-muted' style='font-size:0.97rem;'>${post.story_content ? post.story_content.substring(0,60) : ''}...</div>
                                            ` : `
                                                <div class='fw-semibold mb-1'>${post.content ? post.content.substring(0,40) : ''}...</div>
                                                <div class='mb-2 text-muted' style='font-size:0.97rem;'>${post.content ? post.content.substring(0,60) : ''}...</div>
                                            `}
                                            <div class='mb-2 d-flex align-items-center text-muted' style='font-size:0.97rem;'><i class='bi bi-geo-alt me-1'></i> ${post.location || ''}</div>
                                            <div class='mb-2'>${(post.hashtags || []).map(tag => `<span class='badge bg-light text-primary me-1' style='font-size:0.95rem;'>${tag}</span>`).join('')}</div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <style>@keyframes fadeIn {from{opacity:0}to{opacity:1}}</style>
            `;
            document.getElementById('close-modal').onclick = function () {
                modal.remove();
                modal = null;
            };
            // Modal post click opens the main post modal
            modal.querySelectorAll('.post-card').forEach(card => {
                card.onclick = function() {
                    const postId = card.getAttribute('data-post-id');
                    const posts = window.allPosts || [];
                    const post = posts.find(p => p.id.toString() === postId);
                    if (!post) return;
                    if (typeof window.showPostModal === 'function') {
                        window.showPostModal(post);
                    } else {
                        const mainCard = document.querySelector(`.post-card[data-post-id='${postId}']`);
                        if (mainCard) mainCard.click();
                    }
                    modal.remove();
                    modal = null;
                };
            });
        }
        function getResults(query) {
            const posts = window.allPosts || [];
            return posts.filter(post => {
                return (
                    (post.user && post.user.toLowerCase().includes(query)) ||
                    (post.content && post.content.toLowerCase().includes(query)) ||
                    (post.hashtags && post.hashtags.some(tag => tag.toLowerCase().includes(query))) ||
                    (post.location && post.location.toLowerCase().includes(query)) ||
                    (post.guide_title && post.guide_title.toLowerCase().includes(query)) ||
                    (post.story_content && post.story_content.toLowerCase().includes(query))
                );
            });
        }
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal) {
                modal.remove();
                modal = null;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = searchInput.value.trim().toLowerCase();
                if (!query) {
                    if (modal) { modal.remove(); modal = null; }
                    return;
                }
                if (query === lastQuery && modal) return;
                lastQuery = query;
                const results = getResults(query);
                showResults(query, results, window.allPosts || []);
            }
        });
        searchInput.addEventListener('input', function() {
            if (modal) { modal.remove(); modal = null; }
        });
    });

    // Explore filter option buttons functionality
    if (window.location.pathname.startsWith('/explore')) {
        const filterButtons = document.querySelectorAll('.card .btn-outline-secondary');
        const searchInput = document.querySelector('.card input[type="search"]');
        let activeFilter = null;
        let filterValue = null;
        const filterOptions = [
            {
                label: 'All Destinations',
                key: 'location',
                options: ['All', 'Santorini', 'Bali', 'Tokyo', 'Banff', 'Yosemite']
            },
            {
                label: 'All Categories',
                key: 'hashtags',
                options: ['All', '#Adventure', '#Luxury', '#Culture', '#Food', '#Nature', '#Photography']
            },
            {
                label: 'Date Range',
                key: 'date',
                options: ['All', '2024-01', '2024-02', '2024-03']
            },
            {
                label: 'All Contributors',
                key: 'user',
                options: ['All', 'Alex Carter', 'Priya Singh', 'Liam Chen', 'Sara Müller']
            }
        ];
        filterButtons.forEach((btn, i) => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                // Remove any existing dropdown
                document.querySelectorAll('.explore-filter-dropdown').forEach(d => d.remove());
                // Create dropdown
                const dropdown = document.createElement('div');
                dropdown.className = 'explore-filter-dropdown card p-2';
                dropdown.style.position = 'absolute';
                dropdown.style.zIndex = 10000;
                dropdown.style.minWidth = '180px';
                dropdown.style.top = (btn.offsetTop + btn.offsetHeight + 8) + 'px';
                dropdown.style.left = btn.offsetLeft + 'px';
                filterOptions[i].options.forEach(opt => {
                    const optBtn = document.createElement('button');
                    optBtn.className = 'dropdown-item btn btn-link text-start';
                    optBtn.style.fontSize = '1rem';
                    optBtn.textContent = opt;
                    optBtn.onclick = function() {
                        activeFilter = filterOptions[i].key;
                        filterValue = opt === 'All' ? null : opt;
                        searchInput.placeholder = opt === 'All' ? btn.textContent.trim() : `${btn.textContent.trim().replace(/All .*/, '')}${opt}`;
                        dropdown.remove();
                    };
                    dropdown.appendChild(optBtn);
                });
                btn.parentElement.style.position = 'relative';
                btn.parentElement.appendChild(dropdown);
                // Close dropdown on click outside
                setTimeout(() => {
                    document.addEventListener('click', function handler(ev) {
                        if (!dropdown.contains(ev.target) && ev.target !== btn) {
                            dropdown.remove();
                            document.removeEventListener('click', handler);
                        }
                    });
                }, 10);
            });
        });
        // Patch search bar Enter to filter by activeFilter
        if (searchInput) {
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const query = searchInput.value.trim().toLowerCase();
                    const posts = window.allPosts || [];
                    let results = posts;
                    if (activeFilter && filterValue) {
                        if (activeFilter === 'hashtags') {
                            results = results.filter(post => post.hashtags && post.hashtags.map(tag => tag.toLowerCase()).includes(filterValue.toLowerCase()));
                        } else if (activeFilter === 'location') {
                            results = results.filter(post => post.location && post.location.toLowerCase().includes(filterValue.toLowerCase()));
                        } else if (activeFilter === 'user') {
                            results = results.filter(post => post.user && post.user.toLowerCase().includes(filterValue.toLowerCase()));
                        } // date: skip for now
                    }
                    if (query) {
                        results = results.filter(post => (
                            (post.user && post.user.toLowerCase().includes(query)) ||
                            (post.content && post.content.toLowerCase().includes(query)) ||
                            (post.hashtags && post.hashtags.some(tag => tag.toLowerCase().includes(query))) ||
                            (post.location && post.location.toLowerCase().includes(query)) ||
                            (post.guide_title && post.guide_title.toLowerCase().includes(query)) ||
                            (post.story_content && post.story_content.toLowerCase().includes(query))
                        ));
                    }
                    // Show results in the same modal as before
                    let modal = document.getElementById('site-modal');
                    if (!modal) {
                        modal = document.createElement('div');
                        modal.id = 'site-modal';
                        document.body.appendChild(modal);
                    }
                    modal.innerHTML = `
                        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.18);z-index:99999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;">
                            <div style="background:#fff;border-radius:22px;min-width:320px;max-width:700px;width:95vw;padding:2.5rem 2rem 2rem 2rem;box-shadow:0 8px 32px rgba(33,150,243,0.10),0 2px 8px rgba(33,150,243,0.08);position:relative;max-height:90vh;overflow-y:auto;">
                                <button id="close-modal" style="position:absolute;top:18px;right:18px;border:none;background:#f5f7fa;border-radius:50%;width:38px;height:38px;font-size:1.7rem;line-height:1.2;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(33,150,243,0.08);transition:background 0.18s;">&times;</button>
                                <div class="fw-bold mb-3" style="font-size:1.18rem;letter-spacing:0.01em;">Search Results <span class='text-primary'>(${results.length})</span></div>
                                <div class="row gx-4 gy-4">
                                    ${results.length === 0 ? `<div class='text-muted text-center' style='font-size:1.08rem;'>No results found.</div>` : results.map(post => `
                                        <div class='col-lg-4 col-md-6'>
                                            <div class='card saved-post-card mb-4 shadow-sm post-card' data-post-id='${post.id}' style='border-radius:18px;cursor:pointer;'>
                                                <div class='card-body p-3 pb-2'>
                                                    <div class='d-flex align-items-center mb-2'>
                                                        <img src='${post.avatar || ''}' class='rounded-circle me-2' style='width:40px;height:40px;object-fit:cover;'>
                                                        <div class='flex-grow-1'>
                                                            <span class='fw-semibold'>${post.user || ''}</span><br>
                                                            <span class='text-muted small'>@${(post.user || '').toLowerCase().replace(/\s+/g, '_')}</span>
                                                        </div>
                                                    </div>
                                                    <img src='${post.image || ''}' class='w-100 rounded-3 mb-2' style='height:180px;object-fit:cover;'>
                                                    ${post.type === 'guide' ? `
                                                        <div class='fw-semibold mb-1'>${post.guide_title ? post.guide_title.substring(0,40) : ''}...</div>
                                                        <div class='mb-2 text-muted' style='font-size:0.97rem;'>${post.guide_steps && post.guide_steps.length ? post.guide_steps[0].substring(0,60) : ''}...${post.guide_steps && post.guide_steps.length > 1 ? ` (+${post.guide_steps.length-1} steps)` : ''}</div>
                                                    ` : post.type === 'story' ? `
                                                        <div class='fw-semibold mb-1'>Story</div>
                                                        <div class='mb-2 text-muted' style='font-size:0.97rem;'>${post.story_content ? post.story_content.substring(0,60) : ''}...</div>
                                                    ` : `
                                                        <div class='fw-semibold mb-1'>${post.content ? post.content.substring(0,40) : ''}...</div>
                                                        <div class='mb-2 text-muted' style='font-size:0.97rem;'>${post.content ? post.content.substring(0,60) : ''}...</div>
                                                    `}
                                                    <div class='mb-2 d-flex align-items-center text-muted' style='font-size:0.97rem;'><i class='bi bi-geo-alt me-1'></i> ${post.location || ''}</div>
                                                    <div class='mb-2'>${(post.hashtags || []).map(tag => `<span class='badge bg-light text-primary me-1' style='font-size:0.95rem;'>${tag}</span>`).join('')}</div>
                                                </div>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <style>@keyframes fadeIn {from{opacity:0}to{opacity:1}}</style>
                    `;
                    document.getElementById('close-modal').onclick = function () {
                        modal.remove();
                    };
                    modal.querySelectorAll('.post-card').forEach(card => {
                        card.onclick = function() {
                            const postId = card.getAttribute('data-post-id');
                            const posts = window.allPosts || [];
                            const post = posts.find(p => p.id.toString() === postId);
                            if (!post) return;
                            if (typeof window.showPostModal === 'function') {
                                window.showPostModal(post);
                            } else {
                                const mainCard = document.querySelector(`.post-card[data-post-id='${postId}']`);
                                if (mainCard) mainCard.click();
                            }
                            modal.remove();
                        };
                    });
                }
            });
        }
    }

    // Remove modal logic for home feed
    const feedPostsContainer = document.getElementById('feed-posts-list');
    if (feedPostsContainer) {
        feedPostsContainer.removeEventListener && feedPostsContainer.removeEventListener('click', window.feedModalHandler);
        feedPostsContainer.onclick = null;
    }

    document.addEventListener('click', function(e) {
        if (e.target.closest('.delete-post-btn')) {
            const btn = e.target.closest('.delete-post-btn');
            const postId = btn.getAttribute('data-post-id');
            if (!confirm('Are you sure you want to delete this post?')) return;
            fetch(`/delete_post/${postId}`, { method: 'POST' })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        // Remove only the deleted card from the DOM (Option 2)
                        const card = btn.closest('.post-card');
                        if (card) card.remove();
                    } else {
                        alert('Failed to delete post.');
                    }
                })
                .catch(() => alert('Failed to delete post.'));
        }
    });

    // Infinite scroll for home feed (container-based)
    if (document.getElementById('feed-posts-list')) {
        let feedOffset = 0;
        const feedLimit = 10;
        let feedLoading = false;
        let feedHasMore = true;
        const feedPostsList = document.getElementById('feed-posts-list');
        const feedSpinner = document.createElement('div');
        feedSpinner.id = 'feed-loading-spinner';
        feedSpinner.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner-border text-primary" role="status"></span></div>';

        function loadMoreFeedPosts() {
            if (feedLoading || !feedHasMore) return;
            feedLoading = true;
            feedPostsList.appendChild(feedSpinner);
            fetch(`/api/feed?offset=${feedOffset}&limit=${feedLimit}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data.posts)) {
                        data.posts.forEach(post => {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = window.renderFeedPostHtml(post);
                            feedPostsList.appendChild(tempDiv.firstElementChild);
                        });
                        feedOffset += data.posts.length;
                        feedHasMore = data.has_more;
                    }
                })
                .finally(() => {
                    feedLoading = false;
                    if (feedSpinner.parentNode) feedSpinner.parentNode.removeChild(feedSpinner);
                });
        }

        // Initial load
        feedPostsList.innerHTML = '';
        loadMoreFeedPosts();

        feedPostsList.addEventListener('scroll', function() {
            if (!feedHasMore || feedLoading) return;
            const scrollTop = feedPostsList.scrollTop;
            const scrollHeight = feedPostsList.scrollHeight;
            const clientHeight = feedPostsList.clientHeight;
            if (scrollTop + clientHeight > scrollHeight - 200) {
                loadMoreFeedPosts();
            }
        });
    }

    // Infinite scroll for My Trips
    if (document.getElementById('my-trips-posts-list')) {
        let tripsOffset = 0;
        const tripsLimit = 10;
        let tripsLoading = false;
        let tripsHasMore = true;
        const tripsPostsList = document.getElementById('my-trips-posts-list');
        const tripsSpinner = document.createElement('div');
        tripsSpinner.id = 'trips-loading-spinner';
        tripsSpinner.innerHTML = '<div style="text-align:center;padding:20px;"><span class="spinner-border text-primary" role="status"></span></div>';

        function loadMoreTripsPosts() {
            if (tripsLoading || !tripsHasMore) return;
            tripsLoading = true;
            tripsPostsList.appendChild(tripsSpinner);
            fetch(`/api/my_trips?offset=${tripsOffset}&limit=${tripsLimit}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data.posts)) {
                        data.posts.forEach(post => {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = window.renderFeedPostHtml(post);
                            const postElem = tempDiv.firstElementChild;
                            tripsPostsList.appendChild(postElem);
                            // Attach interactivity to the new post card
                            attachPostInteractivity(postElem);
                        });
                        tripsOffset += data.posts.length;
                        tripsHasMore = data.has_more;
                    }
                })
                .finally(() => {
                    tripsLoading = false;
                    if (tripsSpinner.parentNode) tripsSpinner.parentNode.removeChild(tripsSpinner);
                });
        }

        // Initial load
        tripsPostsList.innerHTML = '';
        loadMoreTripsPosts();

        tripsPostsList.addEventListener('scroll', function() {
            if (!tripsHasMore || tripsLoading) return;
            const scrollTop = tripsPostsList.scrollTop;
            const scrollHeight = tripsPostsList.scrollHeight;
            const clientHeight = tripsPostsList.clientHeight;
            if (scrollTop + clientHeight > scrollHeight - 200) {
                loadMoreTripsPosts();
            }
        });
    }
});
window.attachPostInteractivity = attachPostInteractivity;
window.isPostLiked = window.isPostLiked;
window.isPostSaved = window.isPostSaved;
window.likePost = window.likePost;
window.unlikePost = window.unlikePost;
window.savePost = window.savePost;
window.unsavePost = window.unsavePost;
window.getLikedPosts = window.getLikedPosts;
window.getSavedPosts = window.getSavedPosts;
window.renderFeedPostsHomeStyle = window.renderFeedPostsHomeStyle;

// Home Feed page logic
window.renderFeedPostsHomeStyle = function() {
    console.log('renderFeedPostsHomeStyle called');
    const homeFeedContainer = document.getElementById('feed-posts-list');
    if (!homeFeedContainer || !window.allPosts) return;
    
    console.log('Home Feed: allPosts =', window.allPosts);
    homeFeedContainer.innerHTML = window.allPosts.map(post => `
        <div class="card post-card mb-4 shadow-sm" data-post-id="${post.id}" style="border-radius:18px;">
            <div class="card-body p-4">
                <div class="d-flex align-items-center mb-3">
                    <img src="${post.avatar || ''}" class="rounded-circle me-3" style="width:48px;height:48px;object-fit:cover;">
                    <div class="flex-grow-1">
                        <div class="fw-semibold" style="font-size:1.05rem;">${post.user || ''}</div>
                        <div class="text-muted" style="font-size:0.97rem;"><i class="bi bi-geo-alt me-1"></i> ${post.location || ''}</div>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-light rounded-circle p-2" data-bs-toggle="dropdown" style="width:36px;height:36px;">
                            <i class="bi bi-three-dots"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="#" onclick="editPost(${post.id})"><i class="bi bi-pencil me-2"></i>Edit</a></li>
                            <li><a class="dropdown-item text-danger" href="#" onclick="deletePost(${post.id})"><i class="bi bi-trash me-2"></i>Delete</a></li>
                        </ul>
                    </div>
                </div>
                <img src="${post.image || ''}" class="w-100 rounded-3 mb-3" style="height:300px;object-fit:cover;">
                <div class="mb-3" style="font-size:1.05rem;line-height:1.6;">${post.content || ''}</div>
                <div class="mb-3">
                    ${(post.hashtags || []).map(tag => `<span class="badge bg-light text-primary me-1" style="font-size:0.95rem;">${tag}</span>`).join('')}
                </div>
                <div class="d-flex align-items-center justify-content-between">
                    <div class="d-flex align-items-center gap-4">
                        <button class="btn btn-light like-btn" data-post-id="${post.id}" style="font-size:0.97rem;">
                            <i class="bi bi-heart"></i> ${post.likes || 0}
                        </button>
                        <button class="btn btn-light comment-btn" data-post-id="${post.id}" style="font-size:0.97rem;">
                            <i class="bi bi-chat"></i> ${(post.comments || []).length}
                        </button>
                        <button class="btn btn-light save-btn" data-post-id="${post.id}" style="font-size:0.97rem;">
                            <i class="bi bi-bookmark"></i>
                        </button>
                        <button class="btn btn-light share-btn" data-post-id="${post.id}" style="font-size:0.97rem;">
                            <i class="bi bi-share"></i>
                        </button>
                    </div>
                </div>
                <div class="comments-list mt-3" data-post-id="${post.id}">
                    ${(post.comments || []).map(c => `<div class="mb-1"><span class="fw-bold">${c.user}</span> ${c.text}</div>`).join('')}
                </div>
                <form class="comment-form mt-3" data-post-id="${post.id}">
                    <div class="input-group">
                        <input type="text" class="form-control" name="text" placeholder="Add a comment..." style="font-size:0.97rem;">
                        <input type="hidden" name="user" value="You">
                        <button class="btn btn-primary" type="submit" style="font-size:0.97rem;">Post</button>
                    </div>
                </form>
            </div>
        </div>
    `).join('');
    attachPostInteractivity(homeFeedContainer);
};

// My Trips page logic
window.renderMyTripsPostsHomeStyle = function() {
    const myTripsPostsList = document.getElementById('my-trips-posts-list');
    if (!myTripsPostsList || !window.myTripsPosts) return;
    myTripsPostsList.innerHTML = window.myTripsPosts.map(window.renderFeedPostHtml).join('');
    attachPostInteractivity(myTripsPostsList);
};

// Travel Groups page logic
window.renderGroupsPosts = function() {
    const groupsPostsList = document.getElementById('groups-posts-list');
    if (!groupsPostsList || !window.randomPosts) return;
    groupsPostsList.innerHTML = window.randomPosts.map(window.renderFeedPostHtml).join('');
    attachPostInteractivity(groupsPostsList);
};

// Saved Posts page logic
if (savedPostsList && window.allPosts) {
    const savedIds = window.getSavedPosts();
    const savedPosts = window.allPosts.filter(p => savedIds.includes(p.id.toString()));
    window.savedPosts = savedPosts;
    if (savedPosts.length === 0) {
        savedPostsList.innerHTML = '<div class="text-center text-muted py-5">No saved posts yet.</div>';
    } else {
        savedPostsList.innerHTML = savedPosts.map(window.renderFeedPostHtml).join('');
    }
    attachPostInteractivity(savedPostsList);
} 

function showToast(message) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = '#333';
        toast.style.color = '#fff';
        toast.style.padding = '10px 24px';
        toast.style.borderRadius = '24px';
        toast.style.fontSize = '1rem';
        toast.style.zIndex = 99999;
        toast.style.opacity = 0;
        toast.style.transition = 'opacity 0.3s';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = 1;
    setTimeout(() => { toast.style.opacity = 0; }, 1800);
}

function isFeedOrMyTripsContext(btn) {
    // Check if button is in feed or my trips section
    let el = btn;
    while (el) {
        if (el.id === 'feed-posts-list' || el.id === 'my-trips-posts-list') return true;
        el = el.parentElement;
    }
    return false;
}

// Update share button handler
function attachShareHandlers(container=document) {
    container.querySelectorAll('.share-btn').forEach(function (btn) {
        if (!btn.dataset.postId) return;
        btn.onclick = function (e) {
            e.preventDefault();
            const postId = btn.dataset.postId;
            const postUrl = window.location.origin + '/#post-' + postId;
            // Always show modal with sharing options
            showModal('Share Post', `
                <div>Share this post via:</div>
                <button class="btn btn-sm btn-outline-primary mt-2 copy-link-btn" data-link="${postUrl}">Copy Link</button>
                <a class="btn btn-sm btn-outline-success mt-2" href="https://wa.me/?text=${encodeURIComponent(postUrl)}" target="_blank">WhatsApp</a>
                <a class="btn btn-sm btn-outline-info mt-2" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}" target="_blank">Twitter</a>
            `);
            setTimeout(function () {
                document.querySelectorAll('.copy-link-btn').forEach(function (copyBtn) {
                    copyBtn.addEventListener('click', function () {
                        navigator.clipboard.writeText(copyBtn.dataset.link);
                        copyBtn.textContent = 'Copied!';
                    });
                });
            }, 100);
        };
    });
}

// Call attachShareHandlers after rendering posts in all relevant places
window.attachPostInteractivity = function(container=document) {
    // ... existing code ...
    attachShareHandlers(container);
    // ... existing code ...
}; 