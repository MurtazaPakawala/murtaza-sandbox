import { useEffect, useState } from 'react';
import UnivariateRegressionBlog from './blogs/univariate-regression-blog.mdx';
import GaussianDiscriminativeAnalysisBlog from './blogs/gaussian-discriminative-analysis.mdx';
import ReinforcementLearningBlog from './blogs/reinforcement-learning.mdx';
import HalfCheetahRL from './project/halfcheetah-rl.mdx';
import githubMarkDark from './assets/github-mark-dark.svg';
import githubMarkLight from './assets/github-mark-light.svg';
import resumePdf from './files/murtaza_resume.pdf';
import thesisPdf from './files/thesis.pdf';

const blogPosts = [
  {
    id: 'Linear-Regression', 
    title: 'Understanding Regression',
    description: '14 December 2025',
    Component: UnivariateRegressionBlog,
  },
  {
    id: 'Gaussian-Discriminative-Analysis',
    title: 'Gaussian Discriminative Analysis',
    description: '18 December 2025',
    Component: GaussianDiscriminativeAnalysisBlog,
  },
  {
    id: 'Reinforcement-Learning',
    title: 'A shallow dive into Reinforcement Learning',
    description: '6 January 2026',
    Component: ReinforcementLearningBlog,
  },
];

const getPreferredTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export default function App() {
  const [theme, setTheme] = useState(getPreferredTheme);
  const [view, setView] = useState('home');
  const [activePostId, setActivePostId] = useState(blogPosts[0].id);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const githubIcon = theme === 'dark' ? githubMarkLight : githubMarkDark;
  const socialLinks = [
    {
      label: 'GitHub',
      url: 'https://github.com/MurtazaPakawala',
      icon: githubIcon,
    },
    { label: 'Resume', url: resumePdf, external: true },
  ];
  const projects = [
    {
      id: 'HalfCheetah-RL',
      title: 'Making HalfCheetah Run',
      description: 'Looking at different variations of RL methods.',
      Component: HalfCheetahRL,
    },
    {
      title: 'Research Thesis',
      description: 'Inferring Evolutionary Parameters from Phylogenies.',
      url: thesisPdf,
      clickUrl: thesisPdf,
    },
  ];

  const isReading = view === 'blog-post' || view === 'project-post';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('blog-mode', isReading);
  }, [isReading]);

  const toggleTheme = () =>
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  const navigate = (target) => {
    setView(target);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const openPost = (postId) => {
    setActivePostId(postId);
    navigate('blog-post');
  };

  const openProject = (projectId) => {
    setActiveProjectId(projectId);
    navigate('project-post');
  };

  const activePost =
    blogPosts.find((post) => post.id === activePostId) ?? blogPosts[0];
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const shellClass = isReading ? 'is-blog' : 'is-home';

  return (
    <div className={`app-shell ${shellClass}`}>
      <header className='hero'>
        <div>
          <p
            className='eyebrow'
            style={{ cursor: 'pointer' }}
            onClick={() => navigate('home')}
          >
            Murtaza&apos;s Sandbox
          </p>
          <nav className='nav-links'>
            <button type='button' className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>
              About
            </button>
            <button type='button' className={view === 'projects' || view === 'project-post' ? 'active' : ''} onClick={() => navigate('projects')}>
              Projects
            </button>
            <button type='button' className={view === 'blog' || view === 'blog-post' ? 'active' : ''} onClick={() => navigate('blog')}>
              Blog
            </button>
          </nav>
        </div>

        <button
          className='theme-toggle'
          onClick={toggleTheme}
          aria-label='Toggle dark mode'
        >
          {theme === 'dark' ? '☾' : '☀︎'}
        </button>
      </header>

      <main>
        {view === 'home' && (
          <section id='about' className='panel'>
            <h1>About Me</h1>
            <p>
              Hi, I&apos;m Murtaza, a final-year Computer Science (Honours)
              undergraduate student at UNSW Sydney. I enjoy learning about
              machine learning and maths, and I love building projects.
              Outside of study, I like travelling, reading, and playing
              tennis.
            </p>

            <div className='link-row'>
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target='_blank'
                  rel='noreferrer'
                >
                  {link.icon ? (
                    <img
                      src={link.icon}
                      alt=''
                      className='link-icon'
                      aria-hidden='true'
                    />
                  ) : null}
                  {link.label}
                </a>
              ))}
            </div>
          </section>
        )}

        {view === 'projects' && (
          <section id='projects' className='panel'>
            <div className='section-head'>
              <h2>Projects</h2>
            </div>
            <div className='blog-list projects-list'>
              {projects.map((project) => {
                const isInternal = !!project.Component;

                return (
                  <div
                    key={project.title}
                    className='blog-list-item project-card'
                    role='link'
                    tabIndex={0}
                    onClick={() => {
                      if (isInternal) {
                        openProject(project.id);
                      } else if (project.clickUrl) {
                        window.open(project.clickUrl, '_blank', 'noreferrer');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        if (isInternal) {
                          openProject(project.id);
                        } else if (project.clickUrl) {
                          window.open(project.clickUrl, '_blank', 'noreferrer');
                        }
                      }
                    }}
                  >
                    <div className='project-row'>
                      <div className='project-link'>
                        <div className='blog-list-title'>
                          {project.title}
                          {isInternal ? <span className='blog-list-arrow'>→</span> : null}
                        </div>
                        {project.description ? (
                          <div className='blog-list-desc'>
                            {project.description}
                          </div>
                        ) : null}
                      </div>
                      {project.githubUrl ? (
                        <a
                          className='project-icon-link'
                          href={project.githubUrl}
                          target='_blank'
                          rel='noreferrer'
                          aria-label={`${project.title} GitHub`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img
                            src={project.icon}
                            alt=''
                            className='link-icon'
                            aria-hidden='true'
                          />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {view === 'blog' && (
          <section id='blog' className='panel'>
            <div className='section-head'>
              <h2>Blog</h2>
            </div>

            <div className='blog-list'>
              {blogPosts.map((post) => (
                <button
                  key={post.id}
                  type='button'
                  className='blog-list-item'
                  onClick={() => openPost(post.id)}
                >
                  <div className='blog-list-title'>
                    {post.title} <span className='blog-list-arrow'>→</span>
                  </div>
                  {post.description ? (
                    <div className='blog-list-desc'>{post.description}</div>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        )}

        {view === 'blog-post' && (
          <section className='panel blog-panel'>
            <button
              type='button'
              className='text-link'
              onClick={() => navigate('blog')}
            >
              ← Back
            </button>

            {activePost ? <activePost.Component /> : null}
          </section>
        )}

        {view === 'project-post' && activeProject && (
          <section className='panel blog-panel'>
            <button
              type='button'
              className='text-link'
              onClick={() => navigate('projects')}
            >
              ← Back
            </button>

            <activeProject.Component />
          </section>
        )}
      </main>

      <footer className='footer'>
        <p>
          © {new Date().getFullYear()} Murtaz · Built with React &amp; a cup of
          coffee.
        </p>
      </footer>
    </div>
  );
}
