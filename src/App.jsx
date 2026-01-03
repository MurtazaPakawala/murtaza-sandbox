import { useEffect, useState } from 'react';
import UnivariateRegressionBlog from './blogs/univariate-regression-blog.mdx';
import GaussianDiscriminativeAnalysisBlog from './blogs/gaussian-discriminative-analysis.mdx';
import ReinforcementLearningBlog from './blogs/reinforcement-learning.mdx';
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
    description: '30 December 2025',
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
      title: 'Research Thesis',
      description: 'Inferring Evolutionary Parameters from Phylogenies.',
      url: thesisPdf,
      clickUrl: thesisPdf,
    },
    {
      title: 'C++ Neural Network from Scratch',
      url: 'https://github.com/MurtazaPakawala/CPP-ANN',
      githubUrl: 'https://github.com/MurtazaPakawala/CPP-ANN',
      icon: githubIcon,
      clickUrl: 'https://github.com/MurtazaPakawala/CPP-ANN',
    },
    {
      title: 'Course Tracker',
      url: 'https://github.com/JoshSkim/csesoc-competiton',
      githubUrl: 'https://github.com/JoshSkim/csesoc-competiton',
      icon: githubIcon,
      clickUrl: 'https://github.com/JoshSkim/csesoc-competiton',
    },
  ];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('blog-mode', view === 'blog');
  }, [view]);

  const toggleTheme = () =>
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

  const goHomeAndScroll = (sectionId) => {
    setView('home');
    if (!sectionId || typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openPost = (postId) => {
    setActivePostId(postId);
    setView('blog');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activePost =
    blogPosts.find((post) => post.id === activePostId) ?? blogPosts[0];

  return (
    <div className={`app-shell ${view === 'home' ? 'is-home' : 'is-blog'}`}>
      <header className='hero'>
        <div>
          <p className='eyebrow'>Murtaza&apos;s Sandbox</p>
          <nav className='nav-links'>
            <button type='button' onClick={() => goHomeAndScroll('about')}>
              About
            </button>
            <button type='button' onClick={() => goHomeAndScroll('projects')}>
              Projects
            </button>
            <button type='button' onClick={() => goHomeAndScroll('blog')}>
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
        {view === 'blog' ? (
          <section className='panel blog-panel'>
            <button
              type='button'
              className='text-link'
              onClick={() => setView('home')}
            >
              ← Back
            </button>

            {activePost ? <activePost.Component /> : null}
          </section>
        ) : (
          <>
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

            <section id='projects' className='panel'>
              <div className='section-head'>
                <h2>Projects</h2>
              </div>
              <div className='blog-list projects-list'>
                {projects.map((project) => (
                  <div
                    key={project.title}
                    className='blog-list-item project-card'
                    role={project.clickUrl ? 'link' : undefined}
                    tabIndex={project.clickUrl ? 0 : undefined}
                    onClick={() => {
                      if (!project.clickUrl) return;
                      window.open(project.clickUrl, '_blank', 'noreferrer');
                    }}
                    onKeyDown={(event) => {
                      if (!project.clickUrl) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        window.open(project.clickUrl, '_blank', 'noreferrer');
                      }
                    }}
                  >
                    <div className='project-row'>
                      <a
                        className='project-link'
                        href={project.url}
                        target='_blank'
                        rel='noreferrer'
                      >
                        <div className='blog-list-title'>{project.title}</div>
                        {project.description ? (
                          <div className='blog-list-desc'>
                            {project.description}
                          </div>
                        ) : null}
                      </a>
                      {project.githubUrl ? (
                        <a
                          className='project-icon-link'
                          href={project.githubUrl}
                          target='_blank'
                          rel='noreferrer'
                          aria-label={`${project.title} GitHub`}
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
                ))}
              </div>
            </section>

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
          </>
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
