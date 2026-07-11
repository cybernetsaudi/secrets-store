<?php

namespace App\Controllers;

use App\Core\Auth;

class ServerDiagnosticsController
{
    /**
     * Run comprehensive server diagnostics
     * GET /api/admin/server/diagnostics
     */
    public function diagnostics(): array
    {
        try {
            Auth::requireAuth();
        } catch (\Exception $e) {
            http_response_code(401);
            return [
                'error' => 'Authentication required',
                'message' => 'Please log in to access diagnostics.'
            ];
        }

        $results = [
            'timestamp' => date('Y-m-d H:i:s UTC'),
            'server_info' => $this->getServerInfo(),
            'php_info' => $this->getPhpInfo(),
            'command_execution' => $this->testCommandExecution(),
            'nodejs_info' => $this->testNodeJs(),
            'file_system' => $this->testFileSystem(),
            'memory_info' => $this->getMemoryInfo(),
            'build_capabilities' => $this->testBuildCapabilities(),
            'recommendations' => []
        ];

        // Generate recommendations based on results
        $results['recommendations'] = $this->generateRecommendations($results);

        return $results;
    }

    private function getServerInfo(): array
    {
        // Try multiple methods to get home directory
        $home = getenv('HOME');
        if (empty($home)) {
            // Try to get from current user
            $user = get_current_user();
            if (!empty($user)) {
                $home = '/home/' . $user;
                // Verify it exists
                if (!file_exists($home)) {
                    $home = null;
                }
            }
        }
        
        return [
            'os' => PHP_OS,
            'php_version' => PHP_VERSION,
            'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
            'user' => get_current_user(),
            'home' => $home ?: 'Not set',
            'pwd' => getcwd(),
        ];
    }

    private function getPhpInfo(): array
    {
        $info = [
            'version' => PHP_VERSION,
            'sapi' => php_sapi_name(),
            'memory_limit' => ini_get('memory_limit'),
            'max_execution_time' => ini_get('max_execution_time'),
            'post_max_size' => ini_get('post_max_size'),
            'upload_max_filesize' => ini_get('upload_max_filesize'),
        ];

        // Check disabled functions
        $disabled = ini_get('disable_functions');
        $info['disabled_functions'] = $disabled ? explode(',', $disabled) : [];
        
        // Check available functions
        $info['available_functions'] = [
            'proc_open' => function_exists('proc_open'),
            'shell_exec' => function_exists('shell_exec'),
            'exec' => function_exists('exec'),
            'system' => function_exists('system'),
            'passthru' => function_exists('passthru'),
            'popen' => function_exists('popen'),
        ];

        return $info;
    }

    private function testCommandExecution(): array
    {
        $results = [
            'proc_open' => ['available' => false, 'works' => false, 'output' => null, 'error' => null],
            'shell_exec' => ['available' => false, 'works' => false, 'output' => null, 'error' => null],
            'exec' => ['available' => false, 'works' => false, 'output' => null, 'error' => null],
        ];

        // Test proc_open
        if (function_exists('proc_open')) {
            $results['proc_open']['available'] = true;
            $test = $this->executeWithProcOpen('echo "proc_open works"');
            $results['proc_open']['works'] = $test['success'];
            $results['proc_open']['output'] = $test['output'];
            $results['proc_open']['error'] = $test['error'];
        }

        // Test shell_exec
        if (function_exists('shell_exec')) {
            $results['shell_exec']['available'] = true;
            try {
                $output = \shell_exec('echo "shell_exec works" 2>&1');
                $results['shell_exec']['works'] = !empty($output);
                $results['shell_exec']['output'] = trim($output ?: '');
            } catch (\Exception $e) {
                $results['shell_exec']['error'] = $e->getMessage();
            }
        }

        // Test exec
        if (function_exists('exec')) {
            $results['exec']['available'] = true;
            try {
                $output = [];
                $returnVar = 0;
                \exec('echo "exec works" 2>&1', $output, $returnVar);
                $results['exec']['works'] = ($returnVar === 0);
                $results['exec']['output'] = implode("\n", $output);
            } catch (\Exception $e) {
                $results['exec']['error'] = $e->getMessage();
            }
        }

        return $results;
    }

    private function executeWithProcOpen(string $command): array
    {
        $descriptorspec = [
            0 => ['pipe', 'r'],
            1 => ['pipe', 'w'],
            2 => ['pipe', 'w']
        ];

        $wrappedCommand = "bash -c " . escapeshellarg($command);
        $process = proc_open($wrappedCommand, $descriptorspec, $pipes);

        if (!is_resource($process)) {
            return ['success' => false, 'output' => null, 'error' => 'proc_open failed to create process'];
        }

        fclose($pipes[0]);
        $output = stream_get_contents($pipes[1]);
        $error = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $status = proc_close($process);

        return [
            'success' => ($status === 0),
            'output' => trim($output ?: ''),
            'error' => trim($error ?: ''),
            'exit_code' => $status
        ];
    }

    private function testNodeJs(): array
    {
        $info = [
            'available' => false,
            'version' => null,
            'path' => null,
            'npm_available' => false,
            'npm_version' => null,
            'nvm_available' => false,
            'nvm_path' => null,
            'test_command' => null,
        ];

        $homeDir = getenv('HOME') ?: '/home/u950050130';
        $nvmPath = $homeDir . '/.nvm';

        // Check NVM
        if (file_exists($nvmPath . '/nvm.sh')) {
            $info['nvm_available'] = true;
            $info['nvm_path'] = $nvmPath;
        }

        // Try to find Node.js via NVM
        $nodeCheck = $this->executeWithProcOpen("export NVM_DIR=\"{$nvmPath}\" && [ -s \"{$nvmPath}/nvm.sh\" ] && . \"{$nvmPath}/nvm.sh\" && which node 2>/dev/null");
        if ($nodeCheck['success'] && !empty($nodeCheck['output'])) {
            $info['available'] = true;
            $info['path'] = trim($nodeCheck['output']);
            
            // Get version
            $versionCheck = $this->executeWithProcOpen("export NVM_DIR=\"{$nvmPath}\" && [ -s \"{$nvmPath}/nvm.sh\" ] && . \"{$nvmPath}/nvm.sh\" && node --version 2>/dev/null");
            if ($versionCheck['success']) {
                $info['version'] = trim($versionCheck['output']);
            }

            // Check npm
            $npmCheck = $this->executeWithProcOpen("export NVM_DIR=\"{$nvmPath}\" && [ -s \"{$nvmPath}/nvm.sh\" ] && . \"{$nvmPath}/nvm.sh\" && which npm 2>/dev/null");
            if ($npmCheck['success'] && !empty($npmCheck['output'])) {
                $info['npm_available'] = true;
                $npmVersion = $this->executeWithProcOpen("export NVM_DIR=\"{$nvmPath}\" && [ -s \"{$nvmPath}/nvm.sh\" ] && . \"{$nvmPath}/nvm.sh\" && npm --version 2>/dev/null");
                if ($npmVersion['success']) {
                    $info['npm_version'] = trim($npmVersion['output']);
                }
            }
        }

        // Fallback: try system node
        if (!$info['available']) {
            $systemNode = $this->executeWithProcOpen('which node 2>/dev/null');
            if ($systemNode['success'] && !empty($systemNode['output'])) {
                $info['available'] = true;
                $info['path'] = trim($systemNode['output']);
                $versionCheck = $this->executeWithProcOpen('node --version 2>/dev/null');
                if ($versionCheck['success']) {
                    $info['version'] = trim($versionCheck['output']);
                }
            }
        }

        return $info;
    }

    private function testFileSystem(): array
    {
        $homeDir = getenv('HOME') ?: '/home/u950050130';
        $info = [
            'home_dir' => $homeDir,
            'home_exists' => file_exists($homeDir),
            'home_writable' => is_writable($homeDir),
            'temp_dir' => sys_get_temp_dir(),
            'temp_writable' => is_writable(sys_get_temp_dir()),
            'frontend_source' => null,
            'frontend_exists' => false,
            'frontend_writable' => false,
            'deploy_script' => null,
            'deploy_script_exists' => false,
            'deploy_script_executable' => false,
        ];

        // Check frontend source
        $frontendPaths = [
            $homeDir . '/gufc/frontend',
            $homeDir . '/domains/secrets.gatvia.com/frontend',
            $homeDir . '/public_html/frontend',
        ];

        foreach ($frontendPaths as $path) {
            if (file_exists($path)) {
                $info['frontend_source'] = $path;
                $info['frontend_exists'] = true;
                $info['frontend_writable'] = is_writable($path);
                break;
            }
        }

        // Check deploy script
        $deployScripts = [
            $homeDir . '/deploy_server_side.sh',
            $homeDir . '/deploy_client.sh',
        ];

        foreach ($deployScripts as $script) {
            if (file_exists($script)) {
                $info['deploy_script'] = $script;
                $info['deploy_script_exists'] = true;
                $info['deploy_script_executable'] = is_executable($script);
                break;
            }
        }

        return $info;
    }

    private function getMemoryInfo(): array
    {
        $info = [
            'php_memory_limit' => ini_get('memory_limit'),
            'php_memory_usage' => memory_get_usage(true),
            'php_peak_memory' => memory_get_peak_usage(true),
        ];

        // Try to get system memory info
        $memInfo = $this->executeWithProcOpen('free -h 2>/dev/null | head -2');
        if ($memInfo['success']) {
            $info['system_memory'] = $memInfo['output'];
        }

        // Get ulimits
        $ulimit = $this->executeWithProcOpen('ulimit -a 2>/dev/null');
        if ($ulimit['success']) {
            $info['ulimits'] = $ulimit['output'];
        }

        return $info;
    }

    private function testBuildCapabilities(): array
    {
        $capabilities = [
            'can_build' => false,
            'can_install_dependencies' => false,
            'webassembly_support' => false,
            'test_results' => [],
        ];

        // Check if Node.js is available
        $nodeInfo = $this->testNodeJs();
        if (!$nodeInfo['available']) {
            $capabilities['test_results'][] = 'Node.js not available - cannot build';
            return $capabilities;
        }

        $capabilities['can_install_dependencies'] = true;

        // Test if we can run a simple npm command
        $homeDir = getenv('HOME') ?: '/home/u950050130';
        $nvmPath = $homeDir . '/.nvm';
        $npmTest = $this->executeWithProcOpen("export NVM_DIR=\"{$nvmPath}\" && [ -s \"{$nvmPath}/nvm.sh\" ] && . \"{$nvmPath}/nvm.sh\" && npm --version 2>/dev/null");
        
        if ($npmTest['success']) {
            $capabilities['can_build'] = true;
            $capabilities['test_results'][] = 'npm is available and working';
        } else {
            $capabilities['test_results'][] = 'npm test failed: ' . ($npmTest['error'] ?: 'Unknown error');
        }

        // Test WebAssembly support (basic check)
        // Use NVM to load Node.js properly
        $homeDir = getenv('HOME') ?: '/home/u950050130';
        $nvmPath = $homeDir . '/.nvm';
        $wasmTest = $this->executeWithProcOpen("export NVM_DIR=\"{$nvmPath}\" && [ -s \"{$nvmPath}/nvm.sh\" ] && . \"{$nvmPath}/nvm.sh\" && node -e 'try { WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0])); console.log(\"WASM supported\"); } catch(e) { console.log(\"WASM error:\", e.message); }' 2>&1");
        if ($wasmTest['success'] && stripos($wasmTest['output'], 'WASM supported') !== false) {
            $capabilities['webassembly_support'] = true;
            $capabilities['test_results'][] = 'WebAssembly is supported in Node.js';
        } else {
            $capabilities['test_results'][] = 'WebAssembly test: ' . ($wasmTest['output'] ?: $wasmTest['error'] ?: 'Failed');
        }

        return $capabilities;
    }

    private function generateRecommendations(array $results): array
    {
        $recommendations = [];

        // Check command execution
        $cmdExec = $results['command_execution'];
        if (!$cmdExec['proc_open']['works'] && !$cmdExec['shell_exec']['works'] && !$cmdExec['exec']['works']) {
            $recommendations[] = [
                'level' => 'critical',
                'issue' => 'No command execution methods available',
                'solution' => 'Contact hosting provider to enable proc_open, shell_exec, or exec. Server-side deployment will not work without this.'
            ];
        }

        // Check Node.js
        if (!$results['nodejs_info']['available']) {
            $recommendations[] = [
                'level' => 'critical',
                'issue' => 'Node.js not available',
                'solution' => 'Install Node.js via NVM or contact hosting provider. Server-side builds require Node.js.'
            ];
        }

        // Check frontend source
        if (!$results['file_system']['frontend_exists']) {
            $recommendations[] = [
                'level' => 'warning',
                'issue' => 'Frontend source code not found on server',
                'solution' => 'Upload frontend source code to server or use local deployment (deploy_client.sh)'
            ];
        }

        // Check WebAssembly
        if ($results['build_capabilities']['webassembly_support']) {
            $recommendations[] = [
                'level' => 'info',
                'issue' => 'WebAssembly is supported',
                'solution' => 'WebAssembly support detected. If builds fail with memory errors, try increasing ulimits or use local deployment.'
            ];
        }

        // Check memory limits
        $ulimits = $results['memory_info']['ulimits'] ?? '';
        if (stripos($ulimits, 'max locked memory') !== false) {
            preg_match('/max locked memory.*?(\d+)/i', $ulimits, $matches);
            if (!empty($matches[1])) {
                $lockedMemKB = (int)$matches[1];
                if ($lockedMemKB < 100000) { // Less than ~100MB
                    $recommendations[] = [
                        'level' => 'critical',
                        'issue' => 'Very low max locked memory limit (' . number_format($lockedMemKB) . ' KB = ' . number_format($lockedMemKB / 1024, 1) . ' MB)',
                        'solution' => 'This is likely causing WebAssembly memory errors. WebAssembly needs to lock memory pages. Current limit is only ' . number_format($lockedMemKB / 1024, 1) . ' MB. Try: ulimit -l unlimited (requires root/admin access). If not possible, use local deployment (./deploy_client.sh) instead.'
                    ];
                }
            }
        }
        
        // Check WebAssembly support
        if (!$results['build_capabilities']['webassembly_support']) {
            $recommendations[] = [
                'level' => 'warning',
                'issue' => 'WebAssembly test failed or not supported',
                'solution' => 'Next.js builds require WebAssembly. If WebAssembly is not working, server-side builds will fail. Use local deployment (./deploy_client.sh) which builds on your machine where WebAssembly works properly.'
            ];
        }

        // Best practice recommendation
        if ($results['nodejs_info']['available'] && $results['command_execution']['proc_open']['works']) {
            $recommendations[] = [
                'level' => 'info',
                'issue' => 'Server-side deployment is possible',
                'solution' => 'However, local deployment (./deploy_client.sh) is more reliable and recommended for production.'
            ];
        }

        return $recommendations;
    }
}
