@echo off
chcp 65001 >nul
title Deploy Thiep Sinh Nhat Chi Hoai Giang len GitHub Pages
color 0B

echo =======================================================================
echo     DANG DAY MA NGUON LEN GITHUB REPOSITORY:
echo     https://github.com/hoangminh11503-stack/birthday-for-hoai-giang
echo =======================================================================
echo.
echo [*] Dang ket noi va day code len...
echo (Neu co cua so trinh duyet bat len, hay bam 'Authorize' de xac nhan nhe!)
echo.

git remote remove origin 2>nul
git remote add origin https://github.com/hoangminh11503-stack/birthday-for-hoai-giang.git
git branch -M main
git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =======================================================================
    echo   🎉 CHUC MUNG! TOAN BO WEBSITE DA DUOC PUSH LEN GITHUB THANH CONG!
    echo =======================================================================
    echo.
    echo [BUOC CUOI CUNG DE BAT LINK GITHUB PAGES]:
    echo 1. Vao link nay tren trinh duyet:
    echo    👉 https://github.com/hoangminh11503-stack/birthday-for-hoai-giang/settings/pages
    echo.
    echo 2. Tai muc 'Build and deployment' ^> 'Branch':
    echo    - Chon: main
    echo    - Nhan: Save
    echo.
    echo 3. Sau 1 phut, link thiep sinh nhat online cua chi Hoai Giang se la:
    echo    🌟 https://hoangminh11503-stack.github.io/birthday-for-hoai-giang/
    echo.
) else (
    echo.
    echo [!] Neu khong muon dung lenh, ban co the bam chu 'uploading an existing file'
    echo ngay tren man hinh trinh duyet va keo tha file vao la xong nhe!
)

echo.
pause
