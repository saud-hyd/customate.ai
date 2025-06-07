import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const BlogPage = () => {
  const blogPosts = [
    {
      id: 'savings-calculator',
      title: 'How Much Are You Saving with Customate?',
      excerpt: 'Discover the real cost savings of AI-powered customer support compared to traditional human agents across different regions and markets.',
      date: 'January 15, 2025',
      readTime: '5 min read',
      category: 'Cost Analysis',
      featured: true
    },
    {
      id: 'traditional-vs-ai',
      title: 'Traditional Vs. AI Customer Support Bots',
      excerpt: 'A comprehensive comparison between rule-based chatbots and modern AI-powered solutions, exploring limitations and opportunities.',
      date: 'January 10, 2025',
      readTime: '8 min read',
      category: 'Technology',
      featured: true
    },
    {
      id: 'choose-chatbot',
      title: 'How to Choose a Customer Support Chatbot for Your Website?',
      excerpt: 'Essential guide to selecting the right AI chatbot for your business needs, covering key features and evaluation criteria.',
      date: 'January 5, 2025',
      readTime: '6 min read',
      category: 'Guide',
      featured: false
    }
  ];

  const categories = ['All', 'Cost Analysis', 'Technology', 'Guide', 'Industry Insights'];
  const [selectedCategory, setSelectedCategory] = React.useState('All');

  const filteredPosts = selectedCategory === 'All' 
    ? blogPosts 
    : blogPosts.filter(post => post.category === selectedCategory);

  return (
    <>
      <Helmet>
        <title>Blog - Customate.ai | AI Customer Support Insights</title>
        <meta name="description" content="Explore insights on AI customer support, chatbot technology, and business automation with Customate.ai's expert blog." />
      </Helmet>
      
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 py-20">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">Customate.ai Blog</h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Discover insights on AI customer support, chatbot technology, cost optimization, and the future of business automation.
              </p>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Posts */}
        {selectedCategory === 'All' && (
          <div className="py-16">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Articles</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {blogPosts.filter(post => post.featured).map((post) => (
                  <article key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                      <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                        <span className="text-orange-600 font-semibold">Featured Article</span>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-block px-3 py-1 text-xs font-medium bg-orange-100 text-orange-600 rounded-full">
                          {post.category}
                        </span>
                        <span className="text-sm text-gray-500">{post.readTime}</span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                        <Link 
                          to={`/blog/${post.id}`}
                          className="hover:text-orange-600 transition-colors"
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">{post.date}</span>
                        <Link 
                          to={`/blog/${post.id}`}
                          className="text-orange-600 font-medium hover:text-orange-700 transition-colors"
                        >
                          Read More →
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Posts */}
        <div className={selectedCategory === 'All' ? 'pb-16' : 'py-16'}>
          <div className="max-w-6xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              {selectedCategory === 'All' ? 'All Articles' : `${selectedCategory} Articles`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => (
                <article key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <span className="text-gray-500 font-medium">{post.category}</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-600 rounded">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500">{post.readTime}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                      <Link 
                        to={`/blog/${post.id}`}
                        className="hover:text-orange-600 transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{post.date}</span>
                      <Link 
                        to={`/blog/${post.id}`}
                        className="text-orange-600 text-sm font-medium hover:text-orange-700 transition-colors"
                      >
                        Read More →
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Stay Updated</h2>
            <p className="text-xl text-orange-100 mb-8">
              Get the latest insights on AI customer support and chatbot technology delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border-0 focus:ring-2 focus:ring-orange-300 focus:outline-none"
              />
              <button className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPage;