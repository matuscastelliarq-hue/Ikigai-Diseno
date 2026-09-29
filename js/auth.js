document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const btnSubmit = document.getElementById('btn-submit');
    const errorMsg = document.getElementById('error-msg');

    // Comprobar si ya hay una sesión activa, si es así, redirigir a admin.html
    const { data: { session } } = await window.supabaseClient.auth.getSession();
    if (session) {
        window.location.href = 'admin.html';
        return;
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) return;

            btnSubmit.disabled = true;
            btnSubmit.innerText = 'Verificando...';
            errorMsg.style.display = 'none';

            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) {
                    throw error;
                }

                // Autenticación exitosa
                window.location.href = 'admin.html';

            } catch (error) {
                errorMsg.innerText = 'Credenciales incorrectas o error de red. Intenta nuevamente.';
                errorMsg.style.display = 'block';
                btnSubmit.disabled = false;
                btnSubmit.innerText = 'Ingresar al Sistema';
            }
        });
    }
});
