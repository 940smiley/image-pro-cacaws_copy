import { useState } from 'react';
import { Terminal, CheckCircle, AlertTriangle, Loader } from 'lucide-react';

declare function run_shell_command(command: string, description?: string): Promise<{ stdout: string, stderr: string, exit_code: number, error: string | null }>;

export default function SourceRepoManager() {
  const [repoPath, setRepoPath] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetup = async () => {
    if (!repoPath) {
      setStatus('error');
      setMessage('Please enter a path for the source repository.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const { stdout, stderr, exit_code } = await run_shell_command(
        `node scripts/setup-source-repo.js ${repoPath}`,
        'Setting up source repository'
      );

      if (exit_code === 0) {
        setStatus('success');
        setMessage(`Successfully created source repository at: ${repoPath}. ${stdout}`);
      } else {
        setStatus('error');
        setMessage(`Error creating source repository: ${stderr}`);
      }
    } catch (e: any) {
      setStatus('error');
      setMessage(e.message);
    }
  };

  return (
    <div className="p-6 bg-gray-50 h-full">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white p-8 rounded-xl shadow-md border">
          <div className="flex items-center gap-4 mb-4">
            <div className="bg-blue-600 p-3 rounded-full text-white">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Source Repository Setup</h2>
              <p className="text-gray-500">Initialize a new Git repository for automated image uploads.</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            This tool will create a new directory with a pre-configured Git repository. You can then push this repository to GitHub and set up the necessary secrets to enable the automated processing workflow.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="repo-path" className="block text-sm font-medium text-gray-700 mb-1">
                New Repository Path
              </label>
              <input
                id="repo-path"
                type="text"
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="../my-image-source-repo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleSetup}
              disabled={status === 'loading'}
              className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold disabled:bg-gray-400"
            >
              {status === 'loading' ? <Loader className="w-5 h-5 animate-spin" /> : 'Initialize Repository'}
            </button>
          </div>

          {message && (
            <div className="mt-6 p-4 rounded-lg"
              style={{
                backgroundColor: status === 'success' ? '#f0fff4' : status === 'error' ? '#fff5f5' : '#f0f9ff',
                color: status === 'success' ? '#2f855a' : status === 'error' ? '#c53030' : '#2b6cb0',
              }}
            >
              <div className="flex items-center gap-3">
                {status === 'success' && <CheckCircle className="w-5 h-5" />}
                {status === 'error' && <AlertTriangle className="w-5 h-5" />}
                <p className="text-sm font-medium">{message}</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-8 text-center">
            <h3 className="text-lg font-semibold text-gray-700">Next Steps</h3>
            <ol className="text-sm text-gray-600 list-decimal list-inside mt-2 inline-block text-left">
                <li>Push the new repository to GitHub.</li>
                <li>In the GitHub repository settings, go to "Secrets and variables" &gt; "Actions".</li>
                <li>Add your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repository secrets.</li>
                <li>Add images to the `images/pending` directory and push to trigger the workflow.</li>
            </ol>
        </div>
      </div>
    </div>
  );
}