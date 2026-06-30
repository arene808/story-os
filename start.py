"""
Story OS — Server Manager
Usage:
  python start.py           Start server (foreground, Ctrl+C to stop)
  python start.py stop      Stop running server
  python start.py status    Check server status
"""

import subprocess
import webbrowser
import time
import sys
import os
import socket

# Force UTF-8 output (fixes GBK encoding errors on Windows Chinese systems)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = 3000
URL = f"http://localhost:{PORT}"
PID_FILE = os.path.join(PROJECT_DIR, ".server.pid")


# ============================================================
# Helpers
# ============================================================

def get_pid():
    if os.path.isfile(PID_FILE):
        with open(PID_FILE, "r") as f:
            try:
                return int(f.read().strip())
            except ValueError:
                return None
    return None


def is_port_in_use():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(("127.0.0.1", PORT))
        sock.close()
        return result == 0
    except Exception:
        return False


def kill_by_port():
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True, encoding="gbk", errors="replace"
        )
        for line in result.stdout.splitlines():
            if f":{PORT}" in line and "LISTENING" in line:
                parts = line.strip().split()
                pid = parts[-1]
                subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
                print(f"[OK] Killed PID {pid} on port {PORT}")
                return True
        return False
    except Exception as e:
        print(f"[FAIL] Could not kill process: {e}")
        return False


def save_pid(pid):
    with open(PID_FILE, "w") as f:
        f.write(str(pid))


def clear_pid():
    if os.path.isfile(PID_FILE):
        os.remove(PID_FILE)


# ============================================================
# Commands
# ============================================================

def cmd_stop():
    print("[>] Stopping Story OS server...")
    killed = kill_by_port()
    clear_pid()
    if killed:
        print("[OK] Server stopped")
    else:
        print(f"[i]  No process found on port {PORT}")


def cmd_status():
    if is_port_in_use():
        print(f"[ON]  Story OS is running -> {URL}")
        pid = get_pid()
        if pid:
            print(f"     PID: {pid}")
    else:
        print(f"[OFF] Story OS is not running")


def cmd_start():
    if is_port_in_use():
        print(f"[!]  Port {PORT} is already in use. Server may already be running.")
        print(f"    Open {URL} or run: python start.py stop")
        webbrowser.open(URL)
        return

    # Ensure dependencies
    if not os.path.isdir(os.path.join(PROJECT_DIR, "node_modules")):
        print("[>] Installing npm dependencies...")
        subprocess.run("npm install", cwd=PROJECT_DIR, check=True, shell=True)
        print("[OK] Dependencies installed")

    # Ensure .env.local exists
    env_file = os.path.join(PROJECT_DIR, ".env.local")
    if not os.path.isfile(env_file):
        example = os.path.join(PROJECT_DIR, ".env.local.example")
        if os.path.isfile(example):
            with open(example, "r", encoding="utf-8") as f:
                content = f.read()
            with open(env_file, "w", encoding="utf-8") as f:
                f.write(content)
            print("[OK] Created .env.local from .env.local.example")

    print("=" * 50)
    print("  Story OS")
    print(f"  {URL}")
    print("  Press Ctrl+C to stop")
    print("=" * 50)
    print()

    server = subprocess.Popen(
        "npm run dev",
        cwd=PROJECT_DIR,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=True,
    )
    save_pid(server.pid)

    opened = False
    try:
        for line in server.stdout:
            # Safe print: replace chars that GBK terminal can't handle
            try:
                print(line, end="")
            except UnicodeEncodeError:
                print(line.encode("ascii", errors="replace").decode("ascii"), end="")
            if not opened and ("Ready in" in line or "Local:" in line):
                opened = True
                time.sleep(0.3)
                webbrowser.open(URL)
    except KeyboardInterrupt:
        print("\n[<] Shutting down...")
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
        clear_pid()
        print("[OK] Server stopped")


# ============================================================
# Entry
# ============================================================

if __name__ == "__main__":
    os.chdir(PROJECT_DIR)
    arg = sys.argv[1] if len(sys.argv) > 1 else "start"

    if arg == "stop":
        cmd_stop()
    elif arg == "status":
        cmd_status()
    elif arg == "start":
        cmd_start()
    else:
        print("Usage: python start.py [start|stop|status]")
        print("  start   Start server (default)")
        print("  stop    Stop server")
        print("  status  Check status")
