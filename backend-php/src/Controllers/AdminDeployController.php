<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\Setting;

class AdminDeployController
{
    private const GITHUB_OWNER = 'iwaqasmaqbool';
    private const GITHUB_REPO = 'secrets-store';
    private const GITHUB_WORKFLOW = 'deploy.yml';
    private const GITHUB_BRANCH = 'main';

    /**
     * Retrieve the GitHub token stored in the settings table.
     * Falls back to the env variable GITHUB_DEPLOY_TOKEN if present.
     */
    private function getGithubToken(): ?string
    {
        // Try env first (useful for local dev / server .env)
        $envToken = getenv('GITHUB_DEPLOY_TOKEN');
        if (!empty($envToken)) {
            return trim($envToken);
        }

        // Try DB settings table (columns: key, value, type, ...)
        try {
            $value = Setting::get('github_deploy_token', '');
            if (is_string($value) && $value !== '') {
                return trim($value);
            }
        }
        catch (\Exception $e) {
            error_log("AdminDeployController::getGithubToken - DB error: " . $e->getMessage());
        }

        return null;
    }

    /**
     * Make a request to the GitHub API.
     */
    private function githubApiRequest(string $method, string $endpoint, array $body = []): array
    {
        $token = $this->getGithubToken();
        if (empty($token)) {
            return ['error' => 'GitHub token not configured', 'http_code' => 0];
        }

        $url = "https://api.github.com" . $endpoint;
        $headers = [
            "Authorization: Bearer {$token}",
            "Accept: application/vnd.github.v3+json",
            "Content-Type: application/json",
            "User-Agent: Secrets-Store-Admin/1.0",
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log("AdminDeployController::githubApiRequest curl error: " . $curlError);
            return ['error' => 'Network error: ' . $curlError, 'http_code' => 0];
        }

        $data = json_decode($response, true) ?? [];
        $data['_http_code'] = $httpCode;
        return $data;
    }

    /**
     * Get failed job/step name for a workflow run (so we can show why deploy failed).
     */
    private function getFailureReason(int $runId): ?string
    {
        $owner = self::GITHUB_OWNER;
        $repo = self::GITHUB_REPO;
        $result = $this->githubApiRequest('GET', "/repos/{$owner}/{$repo}/actions/runs/{$runId}/jobs");
        if (($result['_http_code'] ?? 0) !== 200) {
            return null;
        }
        $jobs = $result['jobs'] ?? [];
        foreach ($jobs as $job) {
            $conclusion = $job['conclusion'] ?? null;
            if ($conclusion !== 'failure') {
                continue;
            }
            $jobName = $job['name'] ?? 'Job';
            $steps = $job['steps'] ?? [];
            foreach ($steps as $step) {
                if (($step['conclusion'] ?? null) === 'failure') {
                    $stepName = $step['name'] ?? 'step';
                    return "{$jobName}: {$stepName}";
                }
            }
            return $jobName;
        }
        return null;
    }

    /**
     * Trigger frontend redeployment via GitHub Actions
     * POST /api/admin/deploy/redeploy
     */
    public function redeploy(): array
    {
        try {
            Auth::requireAuth();
        }
        catch (\Exception $e) {
            http_response_code(401);
            return [
                'error' => 'Authentication required',
                'message' => 'Please log in to deploy the frontend.',
            ];
        }

        $token = $this->getGithubToken();
        if (empty($token)) {
            http_response_code(500);
            return [
                'error' => 'GitHub token not configured',
                'message' => 'The GitHub deploy token is not set. Please contact the system administrator to configure it in the database (settings table, key: github_deploy_token).',
            ];
        }

        $owner = self::GITHUB_OWNER;
        $repo = self::GITHUB_REPO;
        $workflow = self::GITHUB_WORKFLOW;
        $branch = self::GITHUB_BRANCH;

        error_log("AdminDeployController::redeploy - Triggering GitHub Actions workflow: {$workflow} on {$branch}");

        $result = $this->githubApiRequest(
            'POST',
            "/repos/{$owner}/{$repo}/actions/workflows/{$workflow}/dispatches",
        [
            'ref' => $branch,
            'inputs' => [
                'reason' => 'Triggered from secrets.gatvia.com admin at ' . date('Y-m-d H:i:s T'),
            ],
        ]
        );

        $httpCode = $result['_http_code'] ?? 0;

        // GitHub returns 204 No Content on success
        if ($httpCode === 204) {
            error_log("AdminDeployController::redeploy - GitHub Actions workflow dispatched successfully");
            return [
                'success' => true,
                'message' => 'Build triggered on GitHub Actions! This typically takes 3–5 minutes.',
                'status' => 'deploying',
                'github_url' => "https://github.com/{$owner}/{$repo}/actions",
            ];
        }

        if ($httpCode === 401 || $httpCode === 403) {
            http_response_code(500);
            error_log("AdminDeployController::redeploy - GitHub API auth error: HTTP {$httpCode}");
            return [
                'error' => 'GitHub authentication failed',
                'message' => 'The stored GitHub token is invalid or expired. Please update the github_deploy_token in the settings table.',
                'http_code' => $httpCode,
            ];
        }

        if ($httpCode === 422) {
            http_response_code(500);
            error_log("AdminDeployController::redeploy - GitHub API 422: " . json_encode($result));
            return [
                'error' => 'Workflow configuration error',
                'message' => 'GitHub returned a 422 error. Make sure the workflow file exists on the main branch and is valid.',
                'details' => $result['message'] ?? '',
            ];
        }

        http_response_code(500);
        error_log("AdminDeployController::redeploy - Unexpected GitHub API response (HTTP {$httpCode}): " . json_encode($result));
        return [
            'error' => 'Failed to trigger build',
            'message' => $result['message'] ?? 'Unexpected error from GitHub API.',
            'http_code' => $httpCode,
        ];
    }

    /**
     * Check deployment status via GitHub Actions API
     * GET /api/admin/deploy/status
     */
    public function status(): array
    {
        try {
            Auth::requireAuth();
        }
        catch (\Exception $e) {
            http_response_code(401);
            return ['error' => 'Authentication required'];
        }

        $owner = self::GITHUB_OWNER;
        $repo = self::GITHUB_REPO;
        $workflow = self::GITHUB_WORKFLOW;

        // Fetch the most recent run for this workflow
        $result = $this->githubApiRequest(
            'GET',
            "/repos/{$owner}/{$repo}/actions/workflows/{$workflow}/runs?per_page=1"
        );

        $httpCode = $result['_http_code'] ?? 0;

        if ($httpCode !== 200) {
            // Token not configured or network issue — return idle so UI doesn't break
            return [
                'status' => 'idle',
                'message' => 'Could not reach GitHub API (HTTP ' . $httpCode . ')',
            ];
        }

        $runs = $result['workflow_runs'] ?? [];

        if (empty($runs)) {
            return [
                'status' => 'idle',
                'message' => 'No workflow runs found',
            ];
        }

        $latest = $runs[0];
        $ghStatus = $latest['status'] ?? 'unknown'; // queued | in_progress | completed
        $ghConclusion = $latest['conclusion'] ?? null; // success | failure | cancelled | null
        $createdAt = $latest['created_at'] ?? null;
        $updatedAt = $latest['updated_at'] ?? null;
        $runUrl = $latest['html_url'] ?? "https://github.com/{$owner}/{$repo}/actions";
        $runId = $latest['id'] ?? null;

        // Calculate elapsed seconds if still running
        $elapsed = 0;
        if ($createdAt) {
            $elapsed = max(0, time() - strtotime($createdAt));
        }

        // Map GitHub status → our status
        if ($ghStatus === 'queued' || $ghStatus === 'in_progress') {
            return [
                'status' => 'deploying',
                'message' => $ghStatus === 'queued' ? 'Build queued on GitHub Actions...' : 'Build in progress on GitHub Actions...',
                'elapsed' => $elapsed,
                'github_status' => $ghStatus,
                'run_url' => $runUrl,
                'run_id' => $runId,
            ];
        }

        // Completed run
        if ($ghStatus === 'completed') {
            if ($ghConclusion === 'success') {
                // Only report success if it completed within last 10 minutes
                $completedRecently = $updatedAt && (time() - strtotime($updatedAt)) < 600;
                return [
                    'status' => $completedRecently ? 'success' : 'idle',
                    'message' => 'Last deployment succeeded.',
                    'conclusion' => $ghConclusion,
                    'elapsed' => $elapsed,
                    'run_url' => $runUrl,
                    'run_id' => $runId,
                    'failed' => false,
                ];
            }
            else {
                // failure / cancelled / etc. — fetch which step failed so we can show it
                $failureReason = null;
                if ($ghConclusion === 'failure' && $runId) {
                    $failureReason = $this->getFailureReason($runId);
                }
                return [
                    'status' => 'idle',
                    'message' => 'Last deployment ' . ($ghConclusion ?? 'ended') . '.',
                    'conclusion' => $ghConclusion,
                    'elapsed' => $elapsed,
                    'run_url' => $runUrl,
                    'run_id' => $runId,
                    'failed' => true,
                    'failure_reason' => $failureReason,
                ];
            }
        }

        return [
            'status' => 'idle',
            'message' => 'Unknown workflow status: ' . $ghStatus,
        ];
    }

    /**
     * Save or update the GitHub deploy token in the settings table.
     * POST /api/admin/settings/github-token
     */
    public function saveGithubToken(): array
    {
        try {
            Auth::requireAuth();
        }
        catch (\Exception $e) {
            http_response_code(401);
            return ['error' => 'Authentication required'];
        }

        $input = json_decode(file_get_contents('php://input'), true) ?? [];
        $token = trim($input['token'] ?? '');

        if (empty($token)) {
            http_response_code(400);
            return ['error' => 'Token is required'];
        }

        try {
            Setting::set('github_deploy_token', $token, 'string', null);
            return ['success' => true, 'message' => 'GitHub token saved successfully.'];
        }
        catch (\Exception $e) {
            error_log("AdminDeployController::saveGithubToken - DB error: " . $e->getMessage());
            http_response_code(500);
            return ['error' => 'Failed to save token: ' . $e->getMessage()];
        }
    }
}